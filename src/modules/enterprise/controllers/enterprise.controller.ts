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
import { Permissions } from 'src/modules/auth/guards/permission.decorator';
import { User } from 'generated/prisma/client';

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
    @Permissions('REGISTER_ENTERPRISE')
    @Post(routesV1.enterprise.register)
    async registerAndCreatePayment(@GetUser() user: User, @Body() dto: CreateEnterpriseDto) {
        return await this.enterpriseService.registerAndCreatePayment(user.id, dto);
    }


    @ApiOperation({ summary: resourcesV1.GET_PAYMENT.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, PermissionGuard)
    @Permissions('REGISTER_ENTERPRISE')
    @Get(routesV1.enterprise.getPayment.replace(':referenceCode', ':referenceCode'))
    async getPayment(@Param('referenceCode') referenceCode: string, @GetUser() user) {
        return await this.enterpriseService.getPayment(referenceCode, user.id);
    }



    @ApiOperation({ summary: resourcesV1.CANCEL_PAYMENT.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, PermissionGuard)
    @Permissions('REGISTER_ENTERPRISE')
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
    @UseGuards(JWTGuard, PermissionGuard)
    @Permissions('REGISTER_ENTERPRISE')
    @Post(routesV1.enterprise.testWebhook)
    async testPaymentSuccess(@Param('referenceCode') referenceCode: string) {
        return await this.enterpriseService.testPaymentSuccess(referenceCode);
    }
}
