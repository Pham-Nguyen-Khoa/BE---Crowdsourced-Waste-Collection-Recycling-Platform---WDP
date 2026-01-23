import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { PaymentStatus, PaymentMethod, EnterpriseStatus } from 'generated/prisma/enums';

@Injectable()
export class EnterpriseRepository {
    constructor(private readonly prisma: PrismaService) { }

    // ==================== ENTERPRISE ====================

    /**
     * Đăng ký doanh nghiệp mới với status PENDING
     */
    async registerEnterprise(userId: number, dto: any) {
        return this.prisma.enterprise.create({
            data: {
                userId,
                name: dto.name,
                address: dto.address,
                latitude: dto.latitude,
                longitude: dto.longitude,
                capacityKg: dto.capacityKg,
                status: EnterpriseStatus.PENDING,
                serviceAreas: {
                    create: dto.serviceAreas
                },
                wasteTypes: {
                    create: dto.wasteTypes
                }
            }
        });
    }

    /**
     * Tìm enterprise theo user ID
     */
    async findEnterpriseByUserId(userId: number) {
        return this.prisma.enterprise.findFirst({
            where: { userId }
        });
    }

    // ==================== PAYMENT ====================

    /**
     * Tạo payment để kích hoạt enterprise
     */
    async createPayment(userId: number, dto: any) {
        // Kiểm tra enterprise thuộc về user và status PENDING
        const enterprise = await this.prisma.enterprise.findFirst({
            where: {
                id: dto.enterpriseId,
                userId,
                status: EnterpriseStatus.PENDING
            }
        });

        if (!enterprise) {
            throw new Error('Enterprise not found or not eligible for payment');
        }

        // Lấy thông tin subscription plan
        const plan = await this.findSubscriptionPlanById(dto.subscriptionPlanConfigId);
        if (!plan) {
            throw new Error('Subscription plan not found');
        }

        // Tạo payment
        const referenceCode = await this.generateReferenceCode();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 phút

        return this.prisma.payment.create({
            data: {
                userId,
                enterpriseId: dto.enterpriseId,
                subscriptionPlanConfigId: dto.subscriptionPlanConfigId,
                method: PaymentMethod.BANK_TRANSFER,
                status: PaymentStatus.PENDING,
                amount: plan.price,
                currency: 'VND',
                description: `Kích hoạt doanh nghiệp: ${enterprise.name}`,
                referenceCode,
                expiresAt
            },
            include: {
                enterprise: true,
                subscriptionPlanConfig: true
            }
        });
    }

    /**
     * Tìm payment theo reference code
     */
    async findPaymentByReferenceCode(referenceCode: string) {
        return this.prisma.payment.findUnique({
            where: { referenceCode },
            include: {
                subscriptionPlanConfig: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true
                    }
                }
            }
        });
    }

    /**
     * Tìm payment mới nhất theo enterprise ID
     */
    async findPaymentByEnterpriseId(enterpriseId: number) {
        return this.prisma.payment.findFirst({
            where: { enterpriseId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Cập nhật payment status thành PAID
     */
    async markPaymentAsPaid(referenceCode: string, webhookData?: any) {
        return this.prisma.payment.update({
            where: { referenceCode },
            data: {
                status: PaymentStatus.PAID,
                paidAt: new Date(),
                webhookData,
                ...(webhookData?.webhookId && { webhookId: webhookData.webhookId }),
                ...(webhookData?.transactionId && { bankTransactionId: webhookData.transactionId }),
                ...(webhookData?.accountNumber && { bankAccountNumber: webhookData.accountNumber }),
                ...(webhookData?.bankName && { bankName: webhookData.bankName })
            }
        });
    }

    /**
     * Cập nhật payment status thành FAILED
     */
    async markPaymentAsFailed(referenceCode: string) {
        return this.prisma.payment.update({
            where: { referenceCode },
            data: {
                status: PaymentStatus.FAILED,
                failedAt: new Date()
            }
        });
    }

    /**
     * Hủy payment
     */
    async cancelPayment(referenceCode: string) {
        return this.prisma.payment.update({
            where: { referenceCode },
            data: {
                status: PaymentStatus.CANCELLED,
                cancelledAt: new Date()
            }
        });
    }

    // ==================== SUBSCRIPTION ====================

    /**
     * Tìm subscription plan theo ID
     */
    async findSubscriptionPlanById(id: number) {
        return this.prisma.subscriptionPlanConfig.findUnique({
            where: { id }
        });
    }

    /**
     * Lấy danh sách subscription plans active
     */
    async findActiveSubscriptionPlans() {
        return this.prisma.subscriptionPlanConfig.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
    }

    // ==================== BUSINESS LOGIC ====================

    /**
     * Kích hoạt enterprise sau khi thanh toán thành công
     */
    async activateEnterprise(referenceCode: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Tìm payment
            const payment = await tx.payment.findUnique({
                where: { referenceCode },
                include: {
                    enterprise: true,
                    subscriptionPlanConfig: true,
                    user: true
                }
            });

            if (!payment || payment.status !== PaymentStatus.PENDING) {
                throw new Error('Invalid payment');
            }

            // 2. Tạo Subscription
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + payment.subscriptionPlanConfig.durationMonths);

            const subscription = await tx.subscription.create({
                data: {
                    enterpriseId: payment.enterpriseId,
                    subscriptionPlanConfigId: payment.subscriptionPlanConfigId,
                    startDate,
                    endDate
                }
            });

            // 3. Cập nhật Enterprise status thành ACTIVE
            await tx.enterprise.update({
                where: { id: payment.enterpriseId },
                data: { status: EnterpriseStatus.ACTIVE }
            });

            // 4. Cập nhật User role thành ENTERPRISE
            const enterpriseRole = await tx.role.findFirst({
                where: { name: 'ENTERPRISE' }
            });

            if (!enterpriseRole) {
                throw new Error('Enterprise role not found');
            }

            await tx.user.update({
                where: { id: payment.userId },
                data: { roleId: enterpriseRole.id }
            });

            // 5. Cập nhật payment status
            await tx.payment.update({
                where: { referenceCode },
                data: {
                    status: PaymentStatus.PAID,
                    paidAt: new Date()
                }
            });

            return {
                enterprise: { ...payment.enterprise, status: EnterpriseStatus.ACTIVE },
                subscription,
                payment: { ...payment, status: PaymentStatus.PAID, paidAt: new Date() }
            };
        });
    }

    // ==================== UTILITIES ====================

    /**
     * Tạo reference code tự động
     */
    // ==================== SCHEDULER METHODS ====================

    /**
     * Tìm tất cả payment PENDING đã hết hạn
     */
    async findExpiredPayments() {
        return this.prisma.payment.findMany({
            where: {
                status: PaymentStatus.PENDING,
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    }

    /**
     * Tìm Enterprise PENDING tạo > 3 ngày mà chưa có payment nào
     */
    async findOldPendingEnterprises() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 3);

        return this.prisma.enterprise.findMany({
            where: {
                status: EnterpriseStatus.PENDING,
                createdAt: {
                    lt: sevenDaysAgo
                }
            }
        });
    }

    /**
     * Xóa Enterprise (cascade delete sẽ xóa các bảng con)
     */
    async deleteEnterprise(enterpriseId: number) {
        return this.prisma.enterprise.delete({
            where: { id: enterpriseId }
        });
    }

    /**
     * Thống kê Enterprise
     */
    async getEnterpriseStats() {
        const [
            totalEnterprises,
            pendingEnterprises,
            activeEnterprises,
            totalPayments,
            pendingPayments,
            paidPayments
        ] = await Promise.all([
            this.prisma.enterprise.count(),
            this.prisma.enterprise.count({ where: { status: EnterpriseStatus.PENDING } }),
            this.prisma.enterprise.count({ where: { status: EnterpriseStatus.ACTIVE } }),
            this.prisma.payment.count(),
            this.prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
            this.prisma.payment.count({ where: { status: PaymentStatus.PAID } })
        ]);

        return {
            enterprises: {
                total: totalEnterprises,
                pending: pendingEnterprises,
                active: activeEnterprises
            },
            payments: {
                total: totalPayments,
                pending: pendingPayments,
                paid: paidPayments
            }
        };
    }

    // ==================== UTILITIES ====================

    private async generateReferenceCode(): Promise<string> {
        const lastPayment = await this.prisma.payment.findFirst({
            orderBy: { id: 'desc' },
            select: { id: true }
        });

        const nextNumber = (lastPayment?.id || 0) + 1;
        return `PAY${nextNumber.toString().padStart(3, '0')}`;
    }
}
