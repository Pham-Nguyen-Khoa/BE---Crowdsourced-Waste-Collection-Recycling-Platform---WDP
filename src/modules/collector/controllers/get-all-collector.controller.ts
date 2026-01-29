import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { User } from "generated/prisma/client";
import { GetAllCollectorService } from "../services/get-all-collector.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { PermissionGuard } from "src/modules/auth/guards/permissions.guard";
import { Permissions } from "src/modules/auth/guards/permission.decorator";
import { GetCollectorsQueryDto } from "../dtos/get-collectors-query.dto";

@ApiTags(`${resourcesV1.GET_COLLECTORS.parent}`)
@Controller(routesV1.apiversion)
export class GetAllCollectorController {
    constructor(private readonly getAllCollectorService: GetAllCollectorService) { }

    @ApiOperation({ summary: resourcesV1.GET_COLLECTORS.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard, PermissionGuard)
    @Roles(2)
    // @Permissions('GET_COLLECTORS')
    @Get(routesV1.enterprise.getCollectors)
    async getAllCollectors(
        @GetUser() user: User,
        @Query() query: GetCollectorsQueryDto
    ) {
        return this.getAllCollectorService.getAllCollectors(user.id, query);
    }
}

