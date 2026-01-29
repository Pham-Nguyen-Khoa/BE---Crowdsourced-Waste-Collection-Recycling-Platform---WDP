import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { User } from "generated/prisma/client";
import { GetEnterprisesMapService } from "../services/get-enterprises-map.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";

@ApiTags(`${resourcesV1.GET_ENTERPRISES_MAP.parent}`)
@Controller(routesV1.apiversion)
export class GetEnterprisesMapController {
    constructor(private readonly getEnterprisesMapService: GetEnterprisesMapService) { }

    @ApiOperation({ summary: resourcesV1.GET_ENTERPRISES_MAP.displayName })
    @ApiBearerAuth()
    @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'PENDING', 'BANNED', 'EXPIRED', 'OFFLINE'] })
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(4) // ADMIN role
    @Get(routesV1.admin.enterprisesMap)
    async getEnterprisesMap(
        @GetUser() user: User,
        @Query('status') status?: string
    ) {
        return this.getEnterprisesMapService.getEnterprisesMap(status);
    }

    @ApiOperation({ summary: resourcesV1.GET_ENTERPRISE_DETAIL_MAP.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(4)
    @Get(routesV1.admin.enterpriseDetailMap)
    async getEnterpriseDetailMap(
        @GetUser() user: User,
        @Param('id') id: number
    ) {
        return this.getEnterprisesMapService.getEnterpriseDetailMap(Number(id));
    }
}

