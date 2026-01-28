import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionGuard } from "src/modules/auth/guards/permissions.guard";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { ReportAssignmentService } from "src/modules/citizen/services/report-assignment.service";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { Permissions } from "src/modules/auth/guards/permission.decorator";
import { CreateCollectorDto } from "../dtos/create-collector.dto";
import { CreateCollectorService } from "../services/create-collector.service";


@ApiTags(
    `${resourcesV1.CREATE_COLLECTOR.parent}`,
)
@Controller(routesV1.apiversion)
export class CreateCollectorController {
    constructor(
        private readonly createCollectorService: CreateCollectorService,
    ) { }
    @ApiOperation({ summary: resourcesV1.CREATE_COLLECTOR.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard, PermissionGuard)
    @Roles(2)
    @Permissions('CREATE_COLLECTOR')
    @Patch(routesV1.enterprise.createCollector)
    async createCollector(@GetUser() user, @Body() data: CreateCollectorDto) {
        return this.createCollectorService.createCollector(user.id, data);
    }

}