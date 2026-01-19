import { Body, Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { resourcesV1 } from 'src/configs/app.permission';
import { CreateEnterpriseDto } from '../dtos/create-enterprise.dto';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { EnterpriseService } from '../services/enterprise.service';
import { GetUser } from '../../auth/guards/get-user.decorator';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permissions.guard';
import { User } from '@prisma/client';

@ApiTags(
    `${resourcesV1.REGISTER_ENTERPRISE.parent}`,
)
@Controller(routesV1.apiversion)
export class EnterpriseController {
    constructor(private readonly enterpriseService: EnterpriseService) { }

    @ApiOperation({ summary: 'Lấy danh sách gói subscription' })
    @Get(routesV1.enterprise.getPlans)
    async getPlans() {
        return await this.enterpriseService.getSubscriptionPlans();
    }

    @ApiOperation({ summary: resourcesV1.REGISTER_ENTERPRISE.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, PermissionGuard)
    @Post(routesV1.enterprise.register)
    async registerAndCreatePayment(@GetUser() user: User, @Body() dto: CreateEnterpriseDto) {
        return await this.enterpriseService.registerAndCreatePayment(user.id, dto);
    }

    // Legacy APIs - giữ để tương thích
    // @ApiOperation({ summary: 'Đăng ký doanh nghiệp (DEPRECATED - dùng /register)' })
    // @ApiBearerAuth()
    // @UseGuards(JWTGuard, PermissionGuard)
    // @Post(routesV1.enterprise.register.replace('register', 'register-only'))
    // async registerEnterprise(@GetUser() user: User, @Body() dto: CreateEnterpriseDto) {
    //     return await this.enterpriseService.registerEnterprise(user.id, dto);
    // }

    // @ApiOperation({ summary: 'Tạo thanh toán (DEPRECATED - dùng /register)' })
    // @ApiBearerAuth()
    // @UseGuards(JWTGuard, PermissionGuard)
    // @Post(routesV1.enterprise.createPayment)
    // async createPayment(@GetUser() user: User, @Body() dto: CreatePaymentDto) {
    //     return await this.enterpriseService.createPayment(user.id, dto);
    // }

    @ApiOperation({ summary: resourcesV1.GET_PAYMENT.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, PermissionGuard)
    @Get(routesV1.enterprise.getPayment.replace(':referenceCode', ':referenceCode'))
    async getPayment(@Param('referenceCode') referenceCode: string, @GetUser() user) {
        return await this.enterpriseService.getPayment(referenceCode, user.id);
    }

    // @ApiOperation({ summary: 'Kiểm tra trạng thái đăng ký doanh nghiệp của user' })
    // @ApiBearerAuth()
    // @UseGuards(JWTGuard, PermissionGuard)
    // @Get(routesV1.enterprise.getProfile.replace('profile', 'registration-status'))
    // async getRegistrationStatus(@GetUser() user) {
    //     return await this.enterpriseService.getRegistrationStatus(user.id);
    // }

    // @ApiOperation({ summary: 'Resume flow đăng ký (cho enterprise PENDING)' })
    // @ApiBearerAuth()
    // @UseGuards(JWTGuard, PermissionGuard)
    // @Post(routesV1.enterprise.register.replace('register', 'resume'))
    // async resumeRegistration(@GetUser() user) {
    //     return await this.enterpriseService.resumeRegistration(user.id);
    // }

    // @ApiOperation({ summary: 'Retry tạo payment mới (cho payment FAILED/EXPIRED)' })
    // @ApiBearerAuth()
    // @UseGuards(JWTGuard, PermissionGuard)
    // @Post(routesV1.enterprise.createPayment.replace('create-payment', 'retry-payment/:enterpriseId'))
    // async retryPayment(@Param('enterpriseId') enterpriseId: number, @GetUser('id') userId: number) {
    //     return await this.enterpriseService.retryPayment(userId, enterpriseId);
    // }

    @ApiOperation({ summary: resourcesV1.CANCEL_PAYMENT.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, PermissionGuard)
    @Delete(routesV1.enterprise.cancelPayment.replace(':referenceCode', ':referenceCode'))
    async cancelPayment(@Param('referenceCode') referenceCode: string, @GetUser() user) {
        return await this.enterpriseService.cancelPayment(referenceCode, user.id);
    }

    @ApiOperation({ summary: resourcesV1.WEBHOOK_SEPAY.displayName })
    @Post(routesV1.enterprise.webhook)
    async sePayWebhook(@Body() webhookData: any) {
        console.log('Raw SePay webhook:', webhookData);
        return await this.enterpriseService.processSePayWebhookRaw(webhookData);
    }

    @ApiOperation({ summary: resourcesV1.TEST_PAYMENT.displayName })
    @Post(routesV1.enterprise.testWebhook)
    async testPaymentSuccess(@Param('referenceCode') referenceCode: string) {
        return await this.enterpriseService.testPaymentSuccess(referenceCode);
    }
}
