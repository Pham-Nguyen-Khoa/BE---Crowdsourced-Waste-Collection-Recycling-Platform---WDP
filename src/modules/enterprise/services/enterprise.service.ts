import { Injectable } from '@nestjs/common';
import { EnterpriseRepository } from '../repositories/enterprise.repository';
import { CreateEnterpriseDto } from '../dtos/create-enterprise.dto';
import { UpdateEnterpriseDto } from '../dtos/update-enterprise.dto';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { SePayWebhookDto } from '../dtos/sepay-webhook.dto';
import { errorResponse, successResponse } from 'src/common/utils/response.util';
import { QRGenerator } from 'src/common/utils/qr.util';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { DashboardQueryDto, RankingQueryDto, DashboardStatsQueryDto } from '../dtos/dashboard-query.dto';

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

    /**
     * Tạo lại thanh toán mới cho yêu cầu cũ đã hết hạn hoặc failed
     */
    async retryPayment(userId: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null, status: 'PENDING' },
            });

            if (!enterprise) {
                return errorResponse(404, 'Không tìm thấy yêu cầu đăng ký đang chờ xử lý', 'ENTERPRISE_NOT_FOUND');
            }

            const lastPayment = await this.prisma.payment.findFirst({
                where: { enterpriseId: enterprise.id },
                orderBy: { createdAt: 'desc' }
            });

            if (!lastPayment) {
                return errorResponse(400, 'Không tìm thấy lịch sử thanh toán để tạo lại', 'NO_PAYMENT_HISTORY');
            }

            return await this.createPayment(userId, {
                enterpriseId: enterprise.id,
                subscriptionPlanConfigId: lastPayment.subscriptionPlanConfigId
            });
        } catch (error) {
            console.error('Error in retryPayment:', error);
            return errorResponse(500, 'Lỗi tạo lại thanh toán', 'RETRY_PAYMENT_FAILED');
        }
    }

    async getPendingPaymentInfo(userId: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null },
                select: { id: true, name: true, status: true }
            });

            if (!enterprise || enterprise.status !== 'PENDING') {
                return successResponse(200, {
                    hasPendingRegistration: false
                }, 'Không có yêu cầu đăng ký nào đang chờ');
            }

            const lastPayment = await this.prisma.payment.findFirst({
                where: { enterpriseId: enterprise.id },
                include: { subscriptionPlanConfig: true },
                orderBy: { createdAt: 'desc' }
            });

            const now = new Date();
            const expiresAt = lastPayment?.expiresAt || (lastPayment ? new Date(lastPayment.createdAt.getTime() + 30 * 60000) : null);
            const diffMs = expiresAt ? expiresAt.getTime() - now.getTime() : -1;

            const isPaymentValid = lastPayment?.status === 'PENDING' && diffMs > 0;

            if (!isPaymentValid) {
                return successResponse(200, {
                    hasPendingRegistration: true,
                    isPaymentExpired: true,
                    enterpriseName: enterprise.name,
                    message: `Bạn đang có một yêu cầu đăng ký doanh nghiệp **${enterprise.name}** nhưng thanh toán đã hết hạn hoặc bị hủy.`
                }, 'Yêu cầu đăng ký cần được thanh toán lại');
            }

            const minutes = Math.floor(diffMs / 60000);
            const qrCode = QRGenerator.generatePaymentQR({
                bankCode: '970422',
                accountNumber: '0001674486670',
                amount: Number(lastPayment.amount),
                transferContent: `Thanh toan ${lastPayment.referenceCode}`,
                accountHolder: 'PHAM NGUYEN KHOA',
                template: '5HiNLUp'
            });

            return successResponse(200, {
                hasPendingRegistration: true,
                isPaymentExpired: false,
                enterpriseName: enterprise.name,
                message: `Bạn còn **${minutes} phút** để hoàn tất thanh toán cho doanh nghiệp **${enterprise.name}**.`,
                remainingSeconds: Math.floor(diffMs / 1000),
                payment: {
                    referenceCode: lastPayment.referenceCode,
                    amount: Number(lastPayment.amount),
                    expiresAt: lastPayment.expiresAt,
                    planName: lastPayment.subscriptionPlanConfig?.name || 'Gói dịch vụ'
                },
                qrCode
            }, 'Lấy thông tin thanh toán thành công');

        } catch (error) {
            console.error('Error in getPendingPaymentInfo:', error);
            return errorResponse(500, 'Lỗi lấy thông tin thanh toán', 'GET_PENDING_PAYMENT_FAILED');
        }
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
                latitude: enterprise.latitude,
                longitude: enterprise.longitude,
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
                    in: ['WAITING', 'CANCELLED', 'EXPIRED']
                },
                report: {
                    status: {
                        in: ['PENDING', 'CANCELLED']
                    }
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

            // Tìm payment mới nhất của doanh nghiệp (để biết họ có đang gia hạn/nâng cấp gói dở dang không)
            const lastPayment = await this.prisma.payment.findFirst({
                where: { enterpriseId: enterprise.id },
                include: { subscriptionPlanConfig: true },
                orderBy: { createdAt: 'desc' }
            });

            // Chỉ coi là "đang xử lý" nếu nó không phải là PAID
            // Và có thể là PENDING hoặc vừa mới FAILED/CANCELLED
            const hasPendingRenewal = lastPayment && lastPayment.status !== 'PAID';

            const now = new Date();
            const expiresAt = lastPayment?.expiresAt || (lastPayment ? new Date(lastPayment.createdAt.getTime() + 30 * 60000) : null);
            const diffMs = expiresAt ? expiresAt.getTime() - now.getTime() : -1;
            const isPaymentExpired = !lastPayment || lastPayment.status !== 'PENDING' || diffMs <= 0;

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
                pendingPayment: hasPendingRenewal ? {
                    referenceCode: lastPayment.referenceCode,
                    amount: Number(lastPayment.amount),
                    planName: lastPayment.subscriptionPlanConfig.name,
                    subscriptionPlanConfigId: lastPayment.subscriptionPlanConfigId,
                    expiresAt: expiresAt,
                    status: lastPayment.status,
                    isExpired: isPaymentExpired,
                    remainingSeconds: Math.max(0, Math.floor(diffMs / 1000)),
                    qrCode: isPaymentExpired ? null : QRGenerator.generatePaymentQR({
                        bankCode: '970422',
                        accountNumber: '0001674486670',
                        amount: Number(lastPayment.amount),
                        transferContent: `Thanh toan ${lastPayment.referenceCode}`,
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


    async getAcceptedReports(userId: number) {
        try {
            const assignments = await this.enterpriseRepository.findAcceptedReportsByUserId(userId);

            const formattedReports = assignments.map(a => ({
                id: a.report.id,
                reportId: a.reportId,
                status: a.report.status,
                address: a.report.address,
                latitude: Number(a.report.latitude),
                longitude: Number(a.report.longitude),
                description: a.report.description,
                assignedAt: a.assignedAt,
                completedAt: a.completedAt,
                wasteItems: a.report.wasteItems.map(wi => ({
                    wasteType: wi.wasteType,
                    weightKg: Number(wi.weightKg)
                })),
                actualWasteItems: (a.report as any).actualWasteItems?.length > 0 ? (a.report as any).actualWasteItems.map(wi => ({
                    wasteType: wi.wasteType,
                    weightKg: Number(wi.weightKg)
                })) : null,
                actualWeight: a.report.actualWeight ? Number(a.report.actualWeight) : null,
                accuracyBucket: a.report.accuracyBucket,

                images: a.report.images.map(img => img.imageUrl),
                citizen: {
                    fullName: a.report.citizen.fullName,
                    phone: a.report.citizen.phone
                },
                collector: a.collector ? {
                    id: a.collector.id,
                    employeeCode: a.collector.employeeCode,
                    fullName: a.collector.user.fullName,
                    phone: a.collector.user.phone,
                    avatar: a.collector.user.avatar
                } : ((a.report as any).collectorTaskAttempts?.length > 0 ? {
                    id: (a.report as any).collectorTaskAttempts[0].collector.id,
                    employeeCode: (a.report as any).collectorTaskAttempts[0].collector.employeeCode,
                    fullName: (a.report as any).collectorTaskAttempts[0].collector.user.fullName,
                    email: (a.report as any).collectorTaskAttempts[0].collector.user.email,
                    phone: (a.report as any).collectorTaskAttempts[0].collector.user.phone,
                    avatar: (a.report as any).collectorTaskAttempts[0].collector.user.avatar
                } : null)
            }));

            return successResponse(200, formattedReports, 'Lấy danh sách báo cáo đã chấp nhận thành công');
        } catch (error) {
            console.error('Error in getAcceptedReports:', error);
            return errorResponse(500, 'Lỗi lấy danh sách báo cáo', 'GET_ACCEPTED_FAILED');
        }
    }

    /**
     * Lấy lịch sử giao dịch (thành công) của doanh nghiệp
     */
    async getTransactionHistory(userId: number, page?: number, limit?: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null },
                select: { id: true }
            });

            if (!enterprise) {
                return errorResponse(404, 'Không tìm thấy doanh nghiệp', 'ENTERPRISE_NOT_FOUND');
            }

            const skip = (page && limit) ? (page - 1) * limit : undefined;
            const take = limit || undefined;

            const [transactions, total] = await Promise.all([
                this.enterpriseRepository.findSuccessfulPaymentsByEnterpriseId(enterprise.id, skip, take),
                this.enterpriseRepository.countSuccessfulPaymentsByEnterpriseId(enterprise.id)
            ]);

            const formattedTransactions = transactions.map(t => ({
                id: t.id,
                referenceCode: t.referenceCode,
                amount: Number(t.amount),
                currency: t.currency,
                description: t.description,
                planName: t.subscriptionPlanConfig.name,
                paidAt: t.paidAt,
                method: t.method,
                status: t.status
            }));

            return successResponse(200, {
                transactions: formattedTransactions,
                pagination: {
                    total,
                    page: page || 1,
                    limit: limit || total,
                    totalPages: limit ? Math.ceil(total / limit) : 1
                }
            }, 'Lấy lịch sử giao dịch thành công');

        } catch (error) {
            console.error('Error in getTransactionHistory:', error);
            return errorResponse(500, 'Lỗi lấy lịch sử giao dịch', 'GET_TRANSACTIONS_FAILED');
        }
    }

    /**
     * Dashboard Summary
     */
    async getDashboardSummary(userId: number, query: DashboardQueryDto) {
        const enterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
        if (!enterprise) return errorResponse(400, 'Doanh nghiệp không tồn tại');

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const startDate = query.startDate ? new Date(query.startDate) : thirtyDaysAgo;
        const endDate = query.endDate ? new Date(query.endDate) : now;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // 1. Total weight & completed reports
        const stats = await this.prisma.report.aggregate({
            where: {
                currentEnterpriseId: enterprise.id,
                status: 'COMPLETED',
                completedAt: { gte: startDate, lte: endDate }
            },
            _sum: { actualWeight: true },
            _count: { id: true }
        });

        // 2. Active collectors (Online)
        const activeCollectors = await this.prisma.collector.count({
            where: {
                enterpriseId: enterprise.id,
                isActive: true,
                deletedAt: null,
                status: {
                    availability: {
                        in: ['ONLINE_AVAILABLE', 'ONLINE_BUSY']
                    }
                }
            }
        });

        // 3. Today's tasks (Breakdown)
        const [total, pending, collecting, completed] = await Promise.all([
            this.prisma.report.count({
                where: {
                    currentEnterpriseId: enterprise.id,
                    createdAt: { gte: todayStart, lte: todayEnd }
                }
            }),
            this.prisma.report.count({
                where: {
                    currentEnterpriseId: enterprise.id,
                    status: { in: ['ENTERPRISE_RESERVED', 'COLLECTOR_PENDING'] },
                    createdAt: { gte: todayStart, lte: todayEnd }
                }
            }),
            this.prisma.report.count({
                where: {
                    currentEnterpriseId: enterprise.id,
                    status: { in: ['ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'COLLECTED'] },
                    createdAt: { gte: todayStart, lte: todayEnd }
                }
            }),
            this.prisma.report.count({
                where: {
                    currentEnterpriseId: enterprise.id,
                    status: 'COMPLETED',
                    completedAt: { gte: todayStart, lte: todayEnd }
                }
            })
        ]);

        return successResponse(200, {
            totalWeight: Number(stats._sum.actualWeight || 0),
            totalCompletedReports: stats._count.id,
            activeCollectors,
            todayTasks: {
                total,
                pending,
                collecting,
                completed
            },
            period: { startDate, endDate }
        });
    }

    /**
     * Collector Ranking
     */
    async getCollectorRanking(userId: number, query: RankingQueryDto) {
        const enterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
        if (!enterprise) return errorResponse(404, 'Doanh nghiệp không tồn tại');

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const startDate = query.startDate ? new Date(query.startDate) : thirtyDaysAgo;
        const endDate = query.endDate ? new Date(query.endDate) : now;

        const collectors = await this.prisma.collector.findMany({
            where: { enterpriseId: enterprise.id, deletedAt: null },
            include: {
                user: { select: { fullName: true, avatar: true, email: true } },
                reportAssignments: {
                    where: {
                        report: {
                            status: 'COMPLETED',
                            completedAt: { gte: startDate, lte: endDate }
                        }
                    },
                    include: { report: true }
                }
            }
        });

        const ranking = collectors.map(c => {
            const completedTasks = c.reportAssignments.length;
            const totalWeight = c.reportAssignments.reduce((sum, a) => sum + Number(a.report.actualWeight || 0), 0);
            return {
                id: c.id,
                fullName: c.user.fullName,
                avatar: c.user.avatar,
                employeeCode: c.employeeCode,
                trustScore: c.trustScore,
                completedTasks,
                totalWeight
            };
        });

        // Sort ranking
        ranking.sort((a, b) => {
            const sortBy = query.sortBy || 'weight';
            let valA = 0;
            let valB = 0;

            if (sortBy === 'weight') {
                valA = a.totalWeight;
                valB = b.totalWeight;
            } else if (sortBy === 'tasks') {
                valA = a.completedTasks;
                valB = b.completedTasks;
            } else if (sortBy === 'trust') {
                valA = a.trustScore;
                valB = b.trustScore;
            }

            return query.order === 'desc' ? valB - valA : valA - valB;
        });

        return successResponse(200, ranking);
    }

    /**
     * Waste Statistics
     */
    async getWasteStats(userId: number, query: DashboardStatsQueryDto) {
        const enterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);
        if (!enterprise) return errorResponse(404, 'Doanh nghiệp không tồn tại');

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const startDate = query.startDate ? new Date(query.startDate) : thirtyDaysAgo;
        const endDate = query.endDate ? new Date(query.endDate) : now;

        const reports = await this.prisma.report.findMany({
            where: {
                currentEnterpriseId: enterprise.id,
                status: 'COMPLETED',
                completedAt: { gte: startDate, lte: endDate }
            },
            include: {
                wasteItems: true,
                actualWasteItems: true
            }
        });

        const statsMap = new Map<string, any>();

        reports.forEach(r => {
            if (!r.completedAt) return;
            const date = new Date(r.completedAt);
            let groupKey = '';
            let label = '';

            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');

            if (query.interval === 'month') {
                groupKey = `${y}-${m}`;
                label = `Tháng ${m}/${y}`;
            } else if (query.interval === 'week') {
                const firstDayOfYear = new Date(y, 0, 1);
                const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
                const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                groupKey = `${y}-W${String(weekNum).padStart(2, '0')}`;
                label = `Tuần ${weekNum}/${y}`;
            } else {
                groupKey = `${y}-${m}-${d}`;
                label = `Ngày ${d}/${m}`;
            }

            if (!statsMap.has(groupKey)) {
                statsMap.set(groupKey, { ORGANIC: 0, RECYCLABLE: 0, HAZARDOUS: 0, _label: label });
            }
            const groupStats = statsMap.get(groupKey);

            // Ưu tiên lấy dữ liệu đã xác thực (ActualWasteItems)
            // Nếu chưa có (đơn cũ), fallback về dữ liệu Citizen khai báo (WasteItems)
            const itemsToCount = r.actualWasteItems.length > 0 ? r.actualWasteItems : r.wasteItems;

            itemsToCount.forEach(wi => {
                const type = wi.wasteType as string;
                groupStats[type] = (groupStats[type] || 0) + Number(wi.weightKg);
            });
        });

        const result = Array.from(statsMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, stats]) => {
                const { _label, ...rest } = stats;
                return { label: _label, ...rest };
            });

        return successResponse(200, result);
    }
}
