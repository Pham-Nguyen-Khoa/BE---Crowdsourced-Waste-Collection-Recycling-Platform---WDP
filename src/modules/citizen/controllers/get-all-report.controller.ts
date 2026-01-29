import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { resourcesV1 } from 'src/configs/app.permission';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from 'src/modules/auth/guards/get-user.decorator';
import { User } from 'generated/prisma/client';
import { GetAllReportService } from '../services/get-all-report.service';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { GetReportsQueryDto } from '../dtos/get-reports-query.dto';

@ApiTags(`${resourcesV1.GET_REPORTS.parent}`)
@Controller(routesV1.apiversion)
export class GetAllReportController {
    constructor(private readonly citizenService: GetAllReportService) { }

    @ApiOperation({ summary: resourcesV1.GET_REPORTS.displayName })
    @ApiBearerAuth()
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACCEPTED', 'ASSIGNED', 'ON_THE_WAY', 'WAITING_CUSTOMER', 'COLLECTED', 'REJECTED', 'CANCELLED'] })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang (mặc định: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng mỗi trang (mặc định: 10, tối đa: 100)' })
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(1)
    @Get(routesV1.citizen.getReports)
    async getAllReport(
        @GetUser() user: User,
        @Query() query: GetReportsQueryDto
    ) {
        return await this.citizenService.getAllReport(user.id, query);
    }
}
