import { Injectable } from '@nestjs/common';
import { EnterpriseRepository } from '../repositories/enterprise.repository';
import { CreateEnterpriseDto } from '../dtos/create-enterprise.dto';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { SePayWebhookDto } from '../dtos/sepay-webhook.dto';
import { errorResponse, successResponse } from 'src/common/utils/response.util';
import { QRGenerator } from 'src/common/utils/qr.util';

@Injectable()
export class EnterpriseService {
    constructor(private readonly enterpriseRepository: EnterpriseRepository,
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
        try {
            const payment = await this.enterpriseRepository.findPaymentByReferenceCode(referenceCode);
            if (!payment) {
                return errorResponse(404, 'Không tìm thấy thông tin thanh toán', 'PAYMENT_NOT_FOUND');
            }

            if (userId && payment.userId !== userId) {
                return errorResponse(403, 'Không có quyền truy cập', 'FORBIDDEN');
            }

            return successResponse(200, payment);
        } catch (error) {
            return errorResponse(500, 'Lỗi hệ thống', 'INTERNAL_ERROR');
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
        console.log('Raw SePay Webhook Data:', webhookData);

        let paymentReferenceCode = '';

        if (webhookData.content) {
            const match = webhookData.content.match(/Thanh toan ([A-Z0-9]+)/);
            if (match && match[1]) {
                paymentReferenceCode = match[1];
            }
        }

        if (!paymentReferenceCode) {
            paymentReferenceCode = webhookData.referenceCode;
        }

        console.log(`Extracted reference code: ${paymentReferenceCode}`);

        const payment = await this.enterpriseRepository.findPaymentByReferenceCode(paymentReferenceCode);
        if (!payment) {
            console.log(`Payment not found for reference code: ${paymentReferenceCode}`);
            return errorResponse(404, 'Không tìm thấy thanh toán', 'PAYMENT_NOT_FOUND');
        }

        const webhookAmount = webhookData.transferAmount || webhookData.amount;
        if (Number(payment.amount) !== Number(webhookAmount)) {
            console.log(`Amount mismatch: payment=${Number(payment.amount)}, webhook=${webhookAmount}`);
            await this.enterpriseRepository.markPaymentAsFailed(paymentReferenceCode);
            return errorResponse(400, 'Số tiền không khớp', 'AMOUNT_MISMATCH');
        }

        const result = await this.enterpriseRepository.activateEnterprise(paymentReferenceCode);
        return successResponse(200, result, 'Kích hoạt doanh nghiệp thành công');

    }

    async processSePayWebhook(webhookData: SePayWebhookDto) {
        return this.processSePayWebhookRaw(webhookData);
    }

    async getRegistrationStatus(userId: number) {
        try {
            const enterprise = await this.enterpriseRepository.findEnterpriseByUserId(userId);

            if (!enterprise) {
                return successResponse(200, { status: 'NOT_REGISTERED', message: 'Chưa đăng ký doanh nghiệp' });
            }

            if (enterprise.status === 'ACTIVE') {
                return successResponse(200, {
                    status: 'ACTIVE',
                    enterprise,
                    message: 'Doanh nghiệp đã kích hoạt'
                });
            }

            const pendingPayment = await this.enterpriseRepository.findPaymentByEnterpriseId(enterprise.id);

            return successResponse(200, {
                status: 'PENDING_PAYMENT',
                enterprise,
                payment: pendingPayment,
                message: pendingPayment ? 'Đang chờ thanh toán' : 'Cần tạo thanh toán'
            });
        } catch (error) {
            return errorResponse(500, 'Lỗi kiểm tra trạng thái', 'STATUS_CHECK_FAILED');
        }
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
}
