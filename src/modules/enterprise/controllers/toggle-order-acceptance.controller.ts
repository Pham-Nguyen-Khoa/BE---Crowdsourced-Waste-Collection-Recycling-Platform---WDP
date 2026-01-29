import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { User } from "generated/prisma/client";
import { ToggleOrderAcceptanceService } from "../services/toggle-order-acceptance.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { ToggleOrderAcceptanceDto } from "../dtos/toggle-order-acceptance.dto";

@ApiTags(`${resourcesV1.TOGGLE_ORDER_ACCEPTANCE.parent}`)
@Controller(routesV1.apiversion)
export class ToggleOrderAcceptanceController {
    constructor(private readonly toggleOrderAcceptanceService: ToggleOrderAcceptanceService) { }

    @ApiOperation({ summary: resourcesV1.TOGGLE_ORDER_ACCEPTANCE.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(2)
    @Patch(routesV1.enterprise.toggleOrderAcceptance)
    async toggleOrderAcceptance(
        @GetUser() user: User,
        @Body() dto: ToggleOrderAcceptanceDto
    ) {
        return this.toggleOrderAcceptanceService.toggleOrderAcceptance(user.id, dto);
    }

    @ApiOperation({ summary: 'Lấy trạng thái nhận đơn' })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(2)
    @Get(routesV1.enterprise.getOrderAcceptanceStatus)
    async getOrderAcceptanceStatus(@GetUser() user: User) {
        return this.toggleOrderAcceptanceService.getOrderAcceptanceStatus(user.id);
    }
}

