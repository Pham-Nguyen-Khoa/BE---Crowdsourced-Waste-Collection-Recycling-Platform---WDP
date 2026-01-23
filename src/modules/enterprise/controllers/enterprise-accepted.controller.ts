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


@ApiTags(
    `${resourcesV1.ENTERPRISE_ACCEPTED.parent}`,
)
@Controller(routesV1.apiversion)
export class EnterpriseAcceptedController {
    constructor(private readonly reportAssignment: ReportAssignmentService) { }
    @ApiOperation({ summary: resourcesV1.ENTERPRISE_ACCEPTED.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(2)
    @Patch(routesV1.enterprise.acceptedReport)
    async acceptedReport(@Param('reportId') reportId: number, @GetUser() user) {
        return await this.reportAssignment.enterpriseAccept(+reportId, user.id)

    }

}