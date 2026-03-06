import { Injectable } from '@nestjs/common';
import { EnterpriseRepository } from '../repositories/enterprise.repository';
import { CreateEnterpriseDto } from '../dtos/create-enterprise.dto';
import { UpdateEnterpriseDto } from '../dtos/update-enterprise.dto';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { SePayWebhookDto } from '../dtos/sepay-webhook.dto';
import { errorResponse, successResponse } from 'src/common/utils/response.util';
import { QRGenerator } from 'src/common/utils/qr.util';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class EnterpriseService {
    constructor(private readonly enterpriseRepository: EnterpriseRepository,
        private readonly prisma: PrismaService,
    ) { }

    async registerAndCreatePayment(userId: number, dto: CreateEnterpriseDto) {
        const existingEnterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
        if (existingEnterprise) {
            return errorResponse(400, 'Tài khoản đã đăng ký doanh nghiệp', 'ALREADY_ENTERPRISE');
        }

        try {
            const enterprise = await this.enterpriseRepository.registerEnterprise(userId, dto);

            const paymentDto = {
                enterpriseId: enterprise.id,
                subscriptionPlanConfigId: dto.subscriptionPlanConfigId
            };

            (enterprise as any).subscriptionPlanConfigId = dto.subscriptionPlanConfigId;

            const payment = await this.enterpriseRepository.createPayment(userId, paymentDto);

            const qrData = QRGenerator.generatePaymentQR({
                bankCode: '970422',
                accountNumber: '0001674486670',
                amount: Number(payment.amount),
                transferContent: `Thanh toan ${payment.referenceCode}`,
                accountHolder: 'PHAM NGUYEN KHOA',
                template: '5HiNLUp'
            });

            return successResponse(201, {
                enterprise,
                payment,
                qrCode: qrData
            });
        } catch (error) {
            console.error('Error in registerAndCreatePayment:', error);
            return errorResponse(500, 'Lỗi đăng ký doanh nghiệp', 'REGISTER_FAILED');
        }
    }

    async registerEnterprise(userId: number, dto: CreateEnterpriseDto) {
        const existingEnterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
        if (existingEnterprise) {
            return errorResponse(400, 'Tài khoản đã đăng ký doanh nghiệp', 'ALREADY_ENTERPRISE');
        }

        try {
            const enterprise = await this.enterpriseRepository.registerEnterprise(userId, dto);
            return successResponse(201, enterprise);
        } catch (error) {
            return errorResponse(500, 'Lỗi tạo doanh nghiệp', 'CREATE_FAILED');
        }
    }

    async createPayment(userId: number, dto: CreatePaymentDto) {
        try {
            const existingPendingPayment = await this.enterpriseRepository.findPaymentByEnterpriseId(dto.enterpriseId);

            if (existingPendingPayment && existingPendingPayment.status === 'PENDING') {
                if (existingPendingPayment.expiresAt && existingPendingPayment.expiresAt > new Date()) {
                    return errorResponse(400, 'Doanh nghiệp đã có thanh toán đang chờ xử lý', 'PAYMENT_EXISTS');
                }

                await this.enterpriseRepository.cancelPayment(existingPendingPayment.referenceCode);
            }

            const payment = await this.enterpriseRepository.createPayment(userId, dto);

            const qrData = QRGenerator.generatePaymentQR({
                bankCode: '970422',
                accountNumber: '0001674486670',
                amount: Number(payment.amount),
                transferContent: `Thanh toan ${payment.referenceCode}`,
                accountHolder: 'PHAM NGUYEN KHOA',
                template: '5HiNLUp'
            });

            return successResponse(201, {
                payment,
                qrCode: qrData
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return errorResponse(404, 'Doanh nghiệp không tồn tại hoặc không thể kích hoạt', 'ENTERPRISE_NOT_FOUND');
            }
            return errorResponse(500, 'Lỗi tạo thanh toán', 'CREATE_PAYMENT_FAILED');
        }
    }

    async getPayment(referenceCode: string, userId?: number) {
        const payment = await this.enterpriseRepository.findPaymentByReferenceCode(referenceCode);
        if (!payment) {
            return errorResponse(400, 'Không tìm thấy thông tin thanh toán', 'PAYMENT_NOT_FOUND');
        }

        if (userId && payment.userId !== userId) {
            return errorResponse(400, 'Không có quyền truy cập', 'FORBIDDEN');
        }

        return successResponse(200, payment);

    }

    async cancelPayment(referenceCode: string, userId: number) {
        const payment = await this.enterpriseRepository.findPaymentByReferenceCode(referenceCode);
        if (!payment) {
            return errorResponse(404, 'Không tìm thấy thông tin thanh toán', 'PAYMENT_NOT_FOUND');
        }

        if (payment.userId !== userId) {
            return errorResponse(403, 'Không có quyền hủy thanh toán này', 'FORBIDDEN');
        }

        if (payment.status !== 'PENDING') {
            return errorResponse(400, 'Không thể hủy thanh toán đã hoàn tất', 'CANNOT_CANCEL');
        }

        try {
            await this.enterpriseRepository.cancelPayment(referenceCode);

            const enterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
            if (enterprise && enterprise.status === 'PENDING') {
                await this.enterpriseRepository.deleteEnterprise(enterprise.id);
                console.log(`Deleted pending enterprise ${enterprise.id} when canceling payment ${referenceCode}`);
            }

            return successResponse(200, null, 'Hủy thanh toán và đăng ký doanh nghiệp thành công');
        } catch (error) {
            console.error('Error canceling payment:', error);
            return errorResponse(500, 'Lỗi hủy thanh toán', 'CANCEL_FAILED');
        }
    }

    async getSubscriptionPlans() {
        try {
            const plans = await this.enterpriseRepository.findActiveSubscriptionPlans();
            return successResponse(200, plans);
        } catch (error) {
            return errorResponse(500, 'Lỗi lấy danh sách gói', 'GET_PLANS_FAILED');
        }
    }

    async processSePayWebhookRaw(webhookData: any) {

        let paymentReferenceCode = '';

        if (webhookData.content) {
            const match = webhookData.content.match(/(?:Thanh toan|Thanh toán)\s+([A-Z0-9]+)/i);
            if (match && match[1]) {
                paymentReferenceCode = match[1].toUpperCase();
            } else {
            }
        }

        if (!paymentReferenceCode) {
            paymentReferenceCode = webhookData.referenceCode;
        }

        if (!paymentReferenceCode) {
            return errorResponse(400, 'Không tìm thấy mã tham chiếu', 'NO_REFERENCE_CODE');
        }


        const payment = await this.enterpriseRepository.findPaymentByReferenceCode(paymentReferenceCode);
        if (!payment) {
            return errorResponse(404, 'Không tìm thấy thanh toán', 'PAYMENT_NOT_FOUND');
        }


        const webhookAmount = webhookData.transferAmount || webhookData.amount;

        if (Number(payment.amount) !== Number(webhookAmount)) {
            await this.enterpriseRepository.markPaymentAsFailed(paymentReferenceCode);
            return errorResponse(400, 'Số tiền không khớp', 'AMOUNT_MISMATCH');
        }
        const result = await this.enterpriseRepository.activateEnterprise(paymentReferenceCode);

        return successResponse(200, result, 'Kích hoạt doanh nghiệp thành công');
    }

    async processSePayWebhook(webhookData: SePayWebhookDto) {
        return this.processSePayWebhookRaw(webhookData);
    }


    async resumeRegistration(userId: number) {
        try {
            const enterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);

            if (!enterprise) {
                return errorResponse(404, 'Không tìm thấy doanh nghiệp', 'ENTERPRISE_NOT_FOUND');
            }

            if (enterprise.status === 'ACTIVE') {
                return errorResponse(400, 'Doanh nghiệp đã kích hoạt', 'ALREADY_ACTIVE');
            }

            const pendingPayment = await this.enterpriseRepository.findPaymentByEnterpriseId(enterprise.id);

            if (!pendingPayment || pendingPayment.status !== 'PENDING') {
                return errorResponse(400, 'Không có thanh toán đang chờ xử lý', 'NO_PENDING_PAYMENT');
            }

            const subscriptionPlanConfigId = (enterprise as any).subscriptionPlanConfigId || pendingPayment.subscriptionPlanConfigId;

            const qrData = QRGenerator.generatePaymentQR({
                bankCode: '970422',
                accountNumber: '0001674486670',
                amount: Number(pendingPayment.amount),
                transferContent: `Thanh toan ${pendingPayment.referenceCode}`,
                accountHolder: 'PHAM NGUYEN KHOA',
                template: '5HiNLUp'
            });

            return successResponse(200, {
                enterprise,
                payment: pendingPayment,
                qrCode: qrData,
                message: 'Resume thành công'
            });
        } catch (error) {
            return errorResponse(500, 'Lỗi resume đăng ký', 'RESUME_FAILED');
        }
    }

    async retryPayment(userId: number, enterpriseId: number) {
        try {
            const enterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
            if (!enterprise || enterprise.id !== enterpriseId) {
                return errorResponse(403, 'Không có quyền truy cập', 'FORBIDDEN');
            }

            if (enterprise.status === 'ACTIVE') {
                return errorResponse(400, 'Doanh nghiệp đã kích hoạt', 'ALREADY_ACTIVE');
            }

            const existingPayment = await this.enterpriseRepository.findPaymentByEnterpriseId(enterpriseId);
            if (existingPayment && existingPayment.status === 'PENDING') {
                await this.enterpriseRepository.cancelPayment(existingPayment.referenceCode);
            }

            const paymentDto = {
                enterpriseId,
                subscriptionPlanConfigId: (enterprise as any).subscriptionPlanConfigId
            };

            const payment = await this.enterpriseRepository.createPayment(userId, paymentDto);

            const qrData = QRGenerator.generatePaymentQR({
                bankCode: '970422',
                accountNumber: '0001674486670',
                amount: Number(payment.amount),
                transferContent: `Thanh toan ${payment.referenceCode}`,
                accountHolder: 'PHAM NGUYEN KHOA',
                template: '5HiNLUp'
            });

            return successResponse(201, {
                payment,
                qrCode: qrData,
                message: 'Tạo thanh toán mới thành công'
            });
        } catch (error) {
            return errorResponse(500, 'Lỗi tạo thanh toán mới', 'RETRY_FAILED');
        }
    }

    async testPaymentSuccess(referenceCode: string) {
        try {
            const paymentResponse = await this.getPayment(referenceCode);
            if (!paymentResponse.success) {
                return paymentResponse;
            }

            const payment = paymentResponse.data;

            const mockWebhookData = {
                referenceCode: `FT${Date.now()}`,
                transactionId: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                amount: Number(payment.amount),
                transferAmount: Number(payment.amount),
                accountNumber: '0001674486670',
                gateway: 'TestBank',
                transactionDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
                content: `TEST-Thanh toan ${referenceCode}-CHUYEN TIEN-TEST123-MOCK${Date.now()}MOCK`,
                description: `Mock payment test for ${referenceCode}`,
                transferType: 'in',
                accumulated: 999999,
                id: Math.floor(Math.random() * 100000000),
                rawData: {
                    test: true,
                    mock: true,
                    originalReferenceCode: referenceCode,
                    timestamp: new Date().toISOString()
                }
            };

            return await this.processSePayWebhook(mockWebhookData);
        } catch (error) {
            console.log(error)
            return errorResponse(500, 'Lỗi test thanh toán', 'TEST_FAILED');
        }
    }

    /**
     * Lấy thông tin profile của enterprise
     */
    async getEnterpriseProfile(userId: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId },
                include: {
                    serviceAreas: true,
                    wasteTypes: true,
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                            avatar: true,
                        }
                    }
                }
            });
            if (!enterprise) {
                return errorResponse(400, 'Bạn không phải doanh nghiệp', 'NOT_ENTERPRISE');
            }

            return successResponse(200, {
                id: enterprise.id,
                fullName: enterprise.user.fullName,
                email: enterprise.user.email,
                phone: enterprise.user.phone,
                avatar: enterprise.user.avatar,
                name: enterprise.name,
                address: enterprise.address,
                capacityKg: Number(enterprise.capacityKg),
                status: enterprise.status,
                serviceAreas: enterprise.serviceAreas,
                wasteTypes: enterprise.wasteTypes,
                createdAt: enterprise.createdAt,
            }, 'Lấy thông tin enterprise thành công');
        } catch (error) {
            return errorResponse(400, 'Lỗi lấy thông tin enterprise', 'GET_PROFILE_FAILED');
        }
    }

    /**
     * Cập nhật thông tin enterprise
     */
    async updateEnterprise(userId: number, dto: UpdateEnterpriseDto) {
        try {
            const enterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
            if (!enterprise) {
                return errorResponse(400, 'Bạn không phải doanh nghiệp', 'NOT_ENTERPRISE');
            }

            // Cập nhật enterprise
            const updatedEnterprise = await this.enterpriseRepository.updateEnterprise(enterprise.id, {
                name: dto.name,
                address: dto.address,
                latitude: dto.latitude,
                longitude: dto.longitude,
                capacityKg: dto.capacityKg ? Number(dto.capacityKg) : undefined,
            });

            // Cập nhật service areas nếu có
            if (dto.serviceAreas && dto.serviceAreas.length > 0) {
                await this.enterpriseRepository.deleteEnterpriseServiceAreas(enterprise.id);
                await this.enterpriseRepository.createEnterpriseServiceAreas(enterprise.id, dto.serviceAreas);
            }

            // Cập nhật waste types nếu có
            if (dto.wasteTypes && dto.wasteTypes.length > 0) {
                await this.enterpriseRepository.deleteEnterpriseWasteTypes(enterprise.id);
                await this.enterpriseRepository.createEnterpriseWasteTypes(enterprise.id, dto.wasteTypes.map(wt => wt.wasteType as any));
            }

            // Lấy lại dữ liệu mới nhất
            const finalEnterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
            if (!finalEnterprise) {
                return errorResponse(500, 'Không tìm thấy enterprise sau khi cập nhật', 'NOT_FOUND');
            }

            return successResponse(200, {
                id: finalEnterprise.id,
                name: finalEnterprise.name,
                address: finalEnterprise.address,
                latitude: finalEnterprise.latitude,
                longitude: finalEnterprise.longitude,
                capacityKg: Number(finalEnterprise.capacityKg),
                status: finalEnterprise.status,
                serviceAreas: finalEnterprise.serviceAreas,
                wasteTypes: finalEnterprise.wasteTypes,
                createdAt: finalEnterprise.createdAt,
            }, 'Cập nhật enterprise thành công');
        } catch (error) {
            console.error('Error updating enterprise:', error);
            return errorResponse(500, 'Lỗi cập nhật enterprise', 'UPDATE_FAILED');
        }
    }



    async getAllWaitingReports(userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true }
        })

        if (!enterprise) {
            return errorResponse(400, 'Ban khong co quyen truy cap doanh nghiep')
        }

        const enterpriseId = enterprise.id

        const waitingAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
            where: {
                enterpriseId,
                status: {
                    in: ['WAITING', 'ACCEPTED', 'CANCELLED', 'EXPIRED']
                }
            },
            include: {
                report: {
                    include: {
                        citizen: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                                email: true
                            }
                        },
                    }
                }

            },
            orderBy: {
                sentAt: 'desc'
            }
        })

        const reports = waitingAttempts.map(attempt => ({
            ...attempt.report,
            sentAt: attempt.sentAt,
            expiredAt: attempt.expiredAt,
            attemptId: attempt.id
        }))


        return successResponse(200, reports, `Lay thanh cong ${reports.length} bao cao dang doi phan hoi`)
    }

    /**
     * Lấy thông tin subscription hiện tại của enterprise
     */
    async getSubscriptionInfo(userId: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null },
                select: { id: true, name: true, status: true }
            });

            if (!enterprise) {
                return successResponse(200, { status: 'NOT_REGISTERED', message: 'Chưa đăng ký doanh nghiệp' });
            }

            // Ưu tiên subscription đang active; nếu không có thì lấy mới nhất (đã hết hạn)
            let subscription = await this.prisma.subscription.findFirst({
                where: { enterpriseId: enterprise.id, isActive: true },
                orderBy: { endDate: 'desc' },
                include: { subscriptionPlanConfig: true }
            });
            if (!subscription) {
                subscription = await this.prisma.subscription.findFirst({
                    where: { enterpriseId: enterprise.id },
                    orderBy: { createdAt: 'desc' },
                    include: { subscriptionPlanConfig: true }
                });
            }

            const pendingPayment = await this.prisma.payment.findFirst({
                where: { enterpriseId: enterprise.id, status: 'PENDING' },
                include: { subscriptionPlanConfig: true },
                orderBy: { createdAt: 'desc' }
            });

            return successResponse(200, {
                enterpriseId: enterprise.id,
                enterpriseName: enterprise.name,
                enterpriseStatus: enterprise.status,
                subscription: subscription ? {
                    id: subscription.id,
                    planName: subscription.subscriptionPlanConfig.name,
                    durationMonths: subscription.subscriptionPlanConfig.durationMonths,
                    price: Number(subscription.subscriptionPlanConfig.price),
                    startDate: subscription.startDate,
                    endDate: subscription.endDate,
                    isActive: subscription.isActive,
                    isExpired: !subscription.isActive || subscription.endDate < new Date(),
                    timeRemaining: (() => {
                        const msLeft = Math.max(0, subscription.endDate.getTime() - Date.now());
                        const totalSeconds = Math.floor(msLeft / 1000);
                        const days = Math.floor(totalSeconds / 86400);
                        const hours = Math.floor((totalSeconds % 86400) / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        return { days, hours, minutes };
                    })(),
                } : null,
                pendingPayment: pendingPayment ? {
                    referenceCode: pendingPayment.referenceCode,
                    amount: Number(pendingPayment.amount),
                    planName: pendingPayment.subscriptionPlanConfig.name,
                    expiresAt: pendingPayment.expiresAt,
                    status: pendingPayment.status,
                    qrCode: QRGenerator.generatePaymentQR({
                        bankCode: '970422',
                        accountNumber: '0001674486670',
                        amount: Number(pendingPayment.amount),
                        transferContent: `Thanh toan ${pendingPayment.referenceCode}`,
                        accountHolder: 'PHAM NGUYEN KHOA',
                        template: '5HiNLUp'
                    })
                } : null,
            }, 'Lấy thông tin gói dịch vụ thành công');
        } catch (error) {
            return errorResponse(500, 'Lỗi lấy thông tin gói dịch vụ', 'GET_SUBSCRIPTION_FAILED');
        }
    }

    /**
     * Gia hạn gói dịch vụ khi đã EXPIRED (hoặc sắp hết hạn)
     */
    async renewSubscription(userId: number, subscriptionPlanConfigId: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null },
                select: { id: true, name: true, status: true }
            });

            if (!enterprise) {
                return errorResponse(404, 'Không tìm thấy doanh nghiệp', 'ENTERPRISE_NOT_FOUND');
            }

            if (!['ACTIVE', 'EXPIRED', 'OFFLINE'].includes(enterprise.status)) {
                return errorResponse(400, 'Doanh nghiệp không thể gia hạn ở trạng thái này', 'INVALID_STATUS');
            }

            // Hủy payment PENDING cũ nếu có
            const existingPendingPayment = await this.prisma.payment.findFirst({
                where: { enterpriseId: enterprise.id, status: 'PENDING' },
                orderBy: { createdAt: 'desc' }
            });

            if (existingPendingPayment) {
                await this.enterpriseRepository.cancelPayment(existingPendingPayment.referenceCode);
            }

            // Kiểm tra plan
            const plan = await this.enterpriseRepository.findSubscriptionPlanById(subscriptionPlanConfigId);
            if (!plan || !plan.isActive) {
                return errorResponse(404, 'Gói dịch vụ không tồn tại hoặc không còn hoạt động', 'PLAN_NOT_FOUND');
            }

            // Tạo payment mới cho việc gia hạn
            // Dùng timestamp + random suffix để đảm bảo unique tuyệt đối
            const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
            const referenceCode = `REN${uniqueSuffix}`;

            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 30);

            const payment = await this.prisma.payment.create({
                data: {
                    userId,
                    enterpriseId: enterprise.id,
                    subscriptionPlanConfigId,
                    method: 'BANK_TRANSFER',
                    status: 'PENDING',
                    amount: plan.price,
                    currency: 'VND',
                    description: `Gia hạn gói dịch vụ: ${enterprise.name} - ${plan.name}`,
                    referenceCode,
                    expiresAt,
                },
                include: { subscriptionPlanConfig: true }
            });

            const qrData = QRGenerator.generatePaymentQR({
                bankCode: '970422',
                accountNumber: '0001674486670',
                amount: Number(payment.amount),
                transferContent: `Thanh toan ${payment.referenceCode}`,
                accountHolder: 'PHAM NGUYEN KHOA',
                template: '5HiNLUp'
            });

            return successResponse(201, {
                payment: {
                    referenceCode: payment.referenceCode,
                    amount: Number(payment.amount),
                    currency: payment.currency,
                    description: payment.description,
                    planName: payment.subscriptionPlanConfig.name,
                    durationMonths: payment.subscriptionPlanConfig.durationMonths,
                    expiresAt: payment.expiresAt,
                    status: payment.status,
                },
                qrCode: qrData,
            }, 'Tạo yêu cầu gia hạn thành công. Vui lòng chuyển khoản trong 30 phút.');
        } catch (error) {
            console.error('Error in renewSubscription:', error);
            return errorResponse(500, 'Lỗi gia hạn gói dịch vụ', 'RENEW_FAILED');
        }
    }
}
