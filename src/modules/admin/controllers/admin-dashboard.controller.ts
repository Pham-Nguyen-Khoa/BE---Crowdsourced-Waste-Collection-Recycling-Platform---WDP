import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { routesV1 } from 'src/configs/app.routes';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { UpdateSystemConfigDto } from '../dtos/update-system-config.dto';
import { errorResponse } from 'src/common/utils/response.util';

@ApiTags('Admin - Dashboard')
@Controller(routesV1.apiversion + '/admin/dashboard')
@UseGuards(JWTGuard, RolesGuard)
@Roles(4)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  // ── Overview ──────────────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({
    summary: 'Tổng quan hệ thống',
    description:
      'Trả về các số liệu tổng hợp: tổng báo cáo, tổng user đang hoạt động, doanh nghiệp, collector, khiếu nại, điểm thưởng…',
  })
  async getOverview() {
    return this.dashboardService.getOverviewStats();
  }

  // ── Trends ────────────────────────────────────────────────────────────────

  @Get('report-trends')
  @ApiOperation({ summary: 'Xu hướng báo cáo theo ngày (mặc định 30 ngày)' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 30 })
  async getReportTrends(@Query('days') days?: string) {
    return this.dashboardService.getReportTrends(days ? +days : 30);
  }

  @Get('user-trends')
  @ApiOperation({ summary: 'Xu hướng người dùng mới theo ngày (mặc định 30 ngày)' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 30 })
  async getUserTrends(@Query('days') days?: string) {
    return this.dashboardService.getUserTrends(days ? +days : 30);
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  @Get('report-status-breakdown')
  @ApiOperation({ summary: 'Phân tích trạng thái báo cáo (dữ liệu biểu đồ tròn)' })
  async getReportStatusBreakdown() {
    return this.dashboardService.getReportStatusBreakdown();
  }

  @Get('waste-type-stats')
  @ApiOperation({ summary: 'Thống kê loại rác được thu gom' })
  async getWasteTypeStats() {
    return this.dashboardService.getWasteTypeStats();
  }

  @Get('revenue-stats')
  @ApiOperation({ summary: 'Thống kê doanh thu từ subscription' })
  async getRevenueStats() {
    return this.dashboardService.getRevenueStats();
  }

  @Get('top-enterprises')
  @ApiOperation({ summary: 'Top doanh nghiệp theo số lượng báo cáo hoàn thành' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getTopEnterprises(@Query('limit') limit?: string) {
    return this.dashboardService.getTopEnterprises(limit ? +limit : 10);
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Danh sách người dùng (có filter & search)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['CITIZEN', 'COLLECTOR', 'ENTERPRISE', 'ADMIN'],
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'BANNED', 'DELETED'] })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Tìm theo tên, email, phone' })
  async getUsers(@Query() query: any) {
    return this.dashboardService.getUsers(query);
  }

  @Patch('users/:userId/unban')
  @ApiOperation({ summary: 'Mở khóa tài khoản người dùng' })
  async unbanUser(@Param('userId') userId: string) {
    return this.dashboardService.unbanUser(+userId);
  }

  // ── Enterprises ───────────────────────────────────────────────────────────

  @Get('enterprises')
  @ApiOperation({ summary: 'Danh sách doanh nghiệp (có filter & search)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACTIVE', 'OFFLINE', 'BANNED', 'EXPIRED'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getEnterprises(@Query() query: any) {
    return this.dashboardService.getEnterprises(query);
  }

  @Patch('enterprises/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái doanh nghiệp (ACTIVE / BANNED / OFFLINE…)' })
  async updateEnterpriseStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'OFFLINE' | 'BANNED' | 'PENDING' | 'EXPIRED' },
  ) {
    if (!body.status) return errorResponse(400, 'Thiếu trường status');
    return this.dashboardService.updateEnterpriseStatus(+id, body.status);
  }

  // ── System Config ─────────────────────────────────────────────────────────

  @Get('system-config')
  @ApiOperation({ summary: 'Xem cấu hình hệ thống' })
  async getSystemConfig() {
    return this.dashboardService.getSystemConfig();
  }

  @Patch('system-config')
  @ApiOperation({ summary: 'Cập nhật cấu hình hệ thống (multipliers, penalties, base points…)' })
  async updateSystemConfig(@Body() dto: UpdateSystemConfigDto) {
    return this.dashboardService.updateSystemConfig(dto);
  }

  // ── Dispatch Logs ─────────────────────────────────────────────────────────

  @Get('dispatch-logs')
  @ApiOperation({ summary: 'Xem dispatch logs hệ thống' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: ['INFO', 'WARN', 'ERROR'] })
  async getDispatchLogs(@Query() query: any) {
    return this.dashboardService.getDispatchLogs(query);
  }
}
