import {
  Body,
  Controller,
  Patch,
  Post,
  UseGuards,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { EnterpriseRoleGuard } from '../guards/enterprise-role.guard';
import { CollectorRoleGuard } from '../guards/collector-role.guard';
import { CreateCollectorDto } from '../dtos/create-collector.dto';
import { UpdateStatusDto } from '../dtos/update-status.dto';
import { GetUser } from '../../auth/guards/get-user.decorator';
import { CollectorService } from 'src/modules/collector/services/collector.service';
import { UpdateCollectorStatusService } from '../services/update-status.service';
import { CollectorTaskService } from '../../dispatch/services/collector-task.service';
import { CompleteTaskDto } from '../dtos/complete-task.dto';
import { UpdateLocationDto } from 'src/modules/collector/dtos/update-location.dto';
import { ReportDisputeDto } from '../dtos/report-dispute.dto';

@ApiTags('Collectors')
@Controller('/api/v1/collectors')
@ApiBearerAuth()
export class CollectorController {
  constructor(
    private readonly collectorService: CollectorService,
    private readonly statusService: UpdateCollectorStatusService,
    private readonly taskService: CollectorTaskService,
  ) {}

  @ApiOperation({ summary: 'Create a new collector (Enterprise only)' })
  @UseGuards(JWTGuard, EnterpriseRoleGuard)
  @Post()
  async createCollector(@GetUser() user: any, @Body() dto: CreateCollectorDto) {
    return this.collectorService.createCollector(user.enterpriseId, dto);
  }

  @ApiOperation({
    summary: 'Update working status/availability (Collector only)',
  })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Patch('status')
  async updateStatus(@GetUser() user: any, @Body() dto: UpdateStatusDto) {
    return this.statusService.updateStatus(user.collectorId, dto);
  }

  @ApiOperation({ summary: 'Xem các task đang chờ xác nhận' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Get('tasks')
  async getMyTasks(@GetUser() user: any) {
    return this.taskService.getMyPendingTasks(user.collectorId);
  }

  @ApiOperation({ summary: 'Chấp nhận task' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Patch('tasks/:attemptId/accept')
  async acceptTask(
    @GetUser() user: any,
    @Param('attemptId') attemptId: string,
  ) {
    return this.taskService.acceptTask(user.collectorId, +attemptId);
  }

  @ApiOperation({ summary: 'Từ chối task' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Patch('tasks/:attemptId/reject')
  async rejectTask(
    @GetUser() user: any,
    @Param('attemptId') attemptId: string,
  ) {
    return this.taskService.rejectTask(user.collectorId, +attemptId);
  }

  @ApiOperation({ summary: 'Bắt đầu di chuyển tới điểm thu gom' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Patch('reports/:reportId/on-the-way')
  async startMoving(@GetUser() user: any, @Param('reportId') reportId: string) {
    return this.taskService.startMoving(user.collectorId, +reportId);
  }

  @ApiOperation({ summary: 'Check-in đã tới điểm thu gom' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Patch('reports/:reportId/arrived')
  async checkInArrival(
    @GetUser() user: any,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.taskService.checkInArrival(
      user.collectorId,
      +reportId,
      dto.latitude,
      dto.longitude,
    );
  }

  @ApiOperation({ summary: 'Get collector profile' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Get('profile')
  async getProfile(@GetUser() user: any) {
    return this.collectorService.getProfile(user.collectorId);
  }

  @ApiOperation({ summary: 'Xem danh sách các report đã chấp nhận' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Get('reports/accepted')
  async getAcceptedReports(@GetUser() user: any) {
    return this.collectorService.getAcceptedReports(user.collectorId);
  }

  @ApiOperation({
    summary:
      'Xem danh sách các enterprise đã được chấp nhận đơn (có liên quan tới collector)',
  })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Get('enterprises/accepted')
  async getAcceptedEnterprises(@GetUser() user: any) {
    return this.collectorService.getAcceptedEnterprises(user.collectorId);
  }

  @ApiOperation({ summary: 'Xem lịch sử các report đã hoàn thành' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Get('reports/history')
  async getReportHistory(@GetUser() user: any, @Query() query: any) {
    return this.collectorService.getReportHistory(user.collectorId, query);
  }

  @ApiOperation({ summary: 'Hoàn tất thu gom rác' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @Patch('reports/complete')
  async completeTask(
    @GetUser() user: any,
    @Body() dto: CompleteTaskDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.taskService.completeTask(user.collectorId, dto, files);
  }

  @ApiOperation({ summary: 'Báo vắng khách (FAILED_NO_RESPONSE)' })
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @Patch('reports/:reportId/no-response')
  async markNoResponse(
    @GetUser() user: any,
    @Param('reportId') reportId: string,
  ) {
    return this.taskService.markNoResponse(user.collectorId, +reportId);
  }

  @ApiOperation({
    summary: 'Báo cáo sự cố/Lừa đảo (khi Citizen không đưa rác)',
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JWTGuard, CollectorRoleGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @Post('reports/:reportId/dispute')
  async reportFake(
    @GetUser() user: any,
    @Param('reportId') reportId: string,
    @Body() dto: ReportDisputeDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.taskService.reportFake(
      user.collectorId,
      +reportId,
      files,
      dto.reason,
    );
  }
}
