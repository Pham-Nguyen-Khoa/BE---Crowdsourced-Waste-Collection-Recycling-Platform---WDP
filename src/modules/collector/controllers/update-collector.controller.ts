import { Body, Controller, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { User } from "generated/prisma/client";
import { UpdateCollectorService } from "../services/update-collector.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { PermissionGuard } from "src/modules/auth/guards/permissions.guard";
import { Permissions } from "src/modules/auth/guards/permission.decorator";
import { UpdateCollectorDto } from "../dtos/update-collector.dto";

@ApiTags(`${resourcesV1.UPDATE_COLLECTOR.parent}`)
@Controller(routesV1.apiversion)
export class UpdateCollectorController {
    constructor(private readonly updateCollectorService: UpdateCollectorService) { }

    @ApiOperation({ summary: resourcesV1.UPDATE_COLLECTOR.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard, PermissionGuard)
    @Roles(2)
    @Permissions('UPDATE_COLLECTOR')
    @Patch(routesV1.enterprise.updateCollector)
    async updateCollector(
        @GetUser() user: User,
        @Param('id') id: number,
        @Body() dto: UpdateCollectorDto
    ) {
        return this.updateCollectorService.updateCollector(user.id, Number(id), dto);
    }
}

