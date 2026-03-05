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
     * Tìm enterprise theo user ID (bao gồm service areas và waste types)
     */
    async findEnterpriseByUserId(userId: number) {
        return this.prisma.enterprise.findFirst({
            where: { userId },
            include: {
                serviceAreas: true,
                wasteTypes: true,
            }
        });
    }

    /**
     * Cập nhật enterprise
     */
    async updateEnterprise(enterpriseId: number, data: {
        name?: string;
        address?: string;
        latitude?: number;
        longitude?: number;
        capacityKg?: number;
    }) {
        return this.prisma.enterprise.update({
            where: { id: enterpriseId },
            data
        });
    }

    /**
     * Xóa tất cả service areas của enterprise
     */
    async deleteEnterpriseServiceAreas(enterpriseId: number) {
        return this.prisma.enterpriseServiceArea.deleteMany({
            where: { enterpriseId }
        });
    }

    /**
     * Tạo service areas cho enterprise
     */
    async createEnterpriseServiceAreas(enterpriseId: number, serviceAreas: any[]) {
        return this.prisma.enterpriseServiceArea.createMany({
            data: serviceAreas.map(sa => ({
                enterpriseId,
                provinceCode: sa.provinceCode,
                districtCode: sa.districtCode ?? null,
                wardCode: sa.wardCode ?? null,
            }))
        });
    }

    /**
     * Xóa tất cả waste types của enterprise
     */
    async deleteEnterpriseWasteTypes(enterpriseId: number) {
        return this.prisma.enterpriseWasteType.deleteMany({
            where: { enterpriseId }
        });
    }

    /**
     * Tạo waste types cho enterprise
     */
    async createEnterpriseWasteTypes(enterpriseId: number, wasteTypes: any[]) {
        return this.prisma.enterpriseWasteType.createMany({
            data: wasteTypes.map(wt => ({
                enterpriseId,
                wasteType: wt
            }))
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

            const now = new Date();

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

            // 2. Tìm subscription còn hạn
            const currentSubscription = await tx.subscription.findFirst({
                where: {
                    enterpriseId: payment.enterpriseId,
                    isActive: true
                },
                orderBy: {
                    endDate: 'desc'
                }
            });

            let subscription;

            console.log('currentSubscription', currentSubscription);
            console.log('now', now);
            console.log('subscription', subscription);

            // CASE 1: còn hạn → gia hạn
            if (currentSubscription && currentSubscription.endDate > now) {

                const newEndDate = new Date(currentSubscription.endDate);
                newEndDate.setMonth(
                    newEndDate.getMonth() + payment.subscriptionPlanConfig.durationMonths
                );

                subscription = await tx.subscription.update({
                    where: { id: currentSubscription.id },
                    data: {
                        endDate: newEndDate
                    }
                });

            }
            // CASE 2: hết hạn hoặc chưa có → tạo mới
            else {

                // deactivate subscription cũ
                await tx.subscription.updateMany({
                    where: {
                        enterpriseId: payment.enterpriseId,
                        isActive: true
                    },
                    data: {
                        isActive: false
                    }
                });

                const endDate = new Date(now);
                endDate.setMonth(
                    endDate.getMonth() + payment.subscriptionPlanConfig.durationMonths
                );

                subscription = await tx.subscription.create({
                    data: {
                        enterpriseId: payment.enterpriseId,
                        subscriptionPlanConfigId: payment.subscriptionPlanConfigId,
                        startDate: now,
                        endDate,
                        isActive: true
                    }
                });
            }

            // 3. Set enterprise status = OFFLINE
            const enterprise = await tx.enterprise.update({
                where: { id: payment.enterpriseId },
                data: {
                    status: EnterpriseStatus.OFFLINE
                }
            });

            // 4. Update role user thành ENTERPRISE
            const enterpriseRole = await tx.role.findFirst({
                where: { name: 'ENTERPRISE' }
            });

            if (!enterpriseRole) {
                throw new Error('Enterprise role not found');
            }

            await tx.user.update({
                where: { id: payment.userId },
                data: {
                    roleId: enterpriseRole.id
                }
            });

            // 5. Update payment
            const updatedPayment = await tx.payment.update({
                where: { referenceCode },
                data: {
                    status: PaymentStatus.PAID,
                    paidAt: now
                }
            });

            return {
                enterprise,
                subscription,
                payment: updatedPayment
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
     * Tìm các subscription đang active nhưng đã hết hạn
     */
    async findExpiredSubscriptions() {
        return this.prisma.subscription.findMany({
            where: {
                isActive: true,
                endDate: {
                    lt: new Date()
                }
            }
        });
    }

    /**
     * Hủy kích hoạt subscription
     */
    async deactivateSubscription(subscriptionId: number) {
        return this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: { isActive: false }
        });
    }

    /**
     * Cập nhật trạng thái enterprise
     */
    async updateEnterpriseStatus(enterpriseId: number, status: EnterpriseStatus) {
        return this.prisma.enterprise.update({
            where: { id: enterpriseId },
            data: { status }
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
