import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JWTGuard } from "src/modules/auth/guards/jwt.guard";
import { RolesGuard } from "src/modules/auth/guards/roles.guard";
import { Roles } from "src/modules/auth/guards/roles.decorator";
import { GetUser } from "src/modules/auth/guards/get-user.decorator";
import { GetDetailReportWaitingService } from "../services/get-detail-report-waiting.service";

@ApiTags(
    `${resourcesV1.GET_DETAIL_REPORT_WAITING.parent}`,
)
@Controller(routesV1.apiversion)
export class GetDetailReportWaitingController {
    constructor(private readonly getDetailService: GetDetailReportWaitingService) { }

    @ApiOperation({ summary: 'Lấy chi tiết báo cáo đang chờ' })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(2)
    @Get(routesV1.enterprise.getDetailWaiting)
    async getDetail(
        @GetUser() user,
        @Param('id') reportId: number
    ) {
        return await this.getDetailService.getDetail(user.id, Number(reportId))
    }

}

