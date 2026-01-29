import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { resourcesV1 } from 'src/configs/app.permission';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from 'src/modules/auth/guards/get-user.decorator';
import { User } from 'generated/prisma/client';
import { GetDetailReportService } from '../services/get-detail-report.service';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { GetDetailReportResponseDto } from '../dtos/get-detail-report.dto';

@ApiTags(`${resourcesV1.GET_REPORTS.parent}`)
@Controller(routesV1.apiversion)
export class GetDetailReportController {
    constructor(private readonly citizenService: GetDetailReportService) { }

    @ApiOperation({ summary: resourcesV1.GET_REPORT.displayName })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: 'Lấy chi tiết đơn thành công', type: GetDetailReportResponseDto })
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(1)
    @Get(routesV1.citizen.getReport)
    async getDetailReport(
        @Param('id') reportId: number,
        @GetUser() user: User,
    ) {
        return await this.citizenService.getDetailReport(user.id, reportId);
    }
}
