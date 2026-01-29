import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { User } from "generated/prisma/client";
import { GetCollectorDetailService } from "../services/get-collector-detail.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { PermissionGuard } from "src/modules/auth/guards/permissions.guard";
import { Permissions } from "src/modules/auth/guards/permission.decorator";

@ApiTags(`${resourcesV1.GET_COLLECTOR_DETAIL.parent}`)
@Controller(routesV1.apiversion)
export class GetCollectorDetailController {
    constructor(private readonly getCollectorDetailService: GetCollectorDetailService) { }

    @ApiOperation({ summary: resourcesV1.GET_COLLECTOR_DETAIL.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard, PermissionGuard)
    @Roles(2)
    // @Permissions('GET_COLLECTOR_DETAIL')
    @Get(routesV1.enterprise.getCollectorDetail)
    async getCollectorDetail(
        @GetUser() user: User,
        @Param('id') id: number
    ) {
        return this.getCollectorDetailService.getCollectorDetail(user.id, Number(id));
    }
}

