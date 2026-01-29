import { Controller, Delete, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { User } from "generated/prisma/client";
import { DeleteCollectorService } from "../services/delete-collector.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { PermissionGuard } from "src/modules/auth/guards/permissions.guard";
import { Permissions } from "src/modules/auth/guards/permission.decorator";

@ApiTags(`${resourcesV1.DELETE_COLLECTOR.parent}`)
@Controller(routesV1.apiversion)
export class DeleteCollectorController {
    constructor(private readonly deleteCollectorService: DeleteCollectorService) { }

    @ApiOperation({ summary: resourcesV1.DELETE_COLLECTOR.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard, PermissionGuard)
    @Roles(2)
    @Permissions('DELETE_COLLECTOR')
    @Delete(routesV1.enterprise.deleteCollector)
    async deleteCollector(
        @GetUser() user: User,
        @Param('id') id: number
    ) {
        return this.deleteCollectorService.deleteCollector(user.id, Number(id));
    }
}

