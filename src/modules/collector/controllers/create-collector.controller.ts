import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1, PermissionCode } from "src/configs/app.permission";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { User } from "generated/prisma/client";
import { CreateCollectorService } from "../services/create-collector.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { CreateCollectorDto } from "../dtos/create-collector.dto";
import { PermissionGuard } from "src/modules/auth/guards/permissions.guard";
import { Permissions } from "src/modules/auth/guards/permission.decorator";

@ApiTags(`${resourcesV1.CREATE_COLLECTOR.parent}`)
@Controller(routesV1.apiversion)
export class CreateCollectorController {
    constructor(private readonly createCollectorService: CreateCollectorService) { }

    @ApiOperation({ summary: resourcesV1.CREATE_COLLECTOR.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard, PermissionGuard)
    @Roles(2)
    @Permissions(PermissionCode.CREATE_COLLECTOR)
    @Post(routesV1.enterprise.createCollector)
    async createCollector(
        @GetUser() user: User,
        @Body() data: CreateCollectorDto
    ) {
        return this.createCollectorService.createCollector(user.id, data);
    }
}

