import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { routesV1 } from "src/configs/app.routes";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { User } from "generated/prisma/client";
import { EnterpriseService } from "../services/enterprise.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { IsInt, IsPositive } from "class-validator";

export class RenewSubscriptionDto {
    @ApiProperty({ description: 'ID của gói dịch vụ muốn gia hạn', example: 1 })
    @IsInt()
    @IsPositive()
    subscriptionPlanConfigId: number;
}

@ApiTags('Enterprise - Subscription')
@Controller(routesV1.apiversion)
export class SubscriptionController {
    constructor(private readonly enterpriseService: EnterpriseService) { }

    @ApiOperation({ summary: 'Lấy thông tin gói dịch vụ hiện tại' })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(2)
    @Get(routesV1.enterprise.getSubscription)
    async getSubscriptionInfo(@GetUser() user: User) {
        return this.enterpriseService.getSubscriptionInfo(user.id);
    }

    @ApiOperation({ summary: 'Gia hạn gói dịch vụ (khi EXPIRED hoặc sắp hết hạn)' })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(2)
    @Post(routesV1.enterprise.renewSubscription)
    async renewSubscription(
        @GetUser() user: User,
        @Body() dto: RenewSubscriptionDto
    ) {
        return this.enterpriseService.renewSubscription(user.id, dto.subscriptionPlanConfigId);
    }
}
