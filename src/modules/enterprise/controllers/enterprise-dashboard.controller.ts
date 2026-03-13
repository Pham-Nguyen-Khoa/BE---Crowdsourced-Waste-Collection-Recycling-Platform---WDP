import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { resourcesV1 } from 'src/configs/app.permission';
import { EnterpriseService } from '../services/enterprise.service';
import { GetUser } from '../../auth/guards/get-user.decorator';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { User } from '@prisma/client';
import { DashboardQueryDto, RankingQueryDto, DashboardStatsQueryDto } from '../dtos/dashboard-query.dto';

@ApiTags('Enterprise - Dashboard')
@ApiBearerAuth()
@UseGuards(JWTGuard, RolesGuard)
@Roles(2)
@Controller(routesV1.apiversion)
export class EnterpriseDashboardController {
  constructor(private readonly enterpriseService: EnterpriseService) { }

  @ApiOperation({ summary: 'Lấy thông tin tổng quan dashboard' })
  @Get(routesV1.enterprise.getDashboardSummary)
  async getSummary(@GetUser() user: User, @Query() query: DashboardQueryDto) {
    return await this.enterpriseService.getDashboardSummary(user.id, query);
  }

  @ApiOperation({ summary: 'Lấy bảng xếp hạng collector' })
  @Get(routesV1.enterprise.getCollectorRanking)
  async getRanking(@GetUser() user: User, @Query() query: RankingQueryDto) {
    return await this.enterpriseService.getCollectorRanking(user.id, query);
  }

  @ApiOperation({ summary: 'Lấy thống kê rác thải theo thời gian' })
  @Get(routesV1.enterprise.getDashboardStats)
  async getStats(@GetUser() user: User, @Query() query: DashboardStatsQueryDto) {
    return await this.enterpriseService.getWasteStats(user.id, query);
  }
}
