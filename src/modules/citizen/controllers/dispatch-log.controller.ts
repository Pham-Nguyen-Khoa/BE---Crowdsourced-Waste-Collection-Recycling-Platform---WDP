import { Controller, Get, Query, UseGuards, Post, Param, HttpException, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger'
import { routesV1 } from 'src/configs/app.routes'
import { resourcesV1 } from 'src/configs/app.permission'
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard'
import { RolesGuard } from 'src/modules/auth/guards/roles.guard'
import { Roles } from 'src/modules/auth/guards/roles.decorator'
import { DispatchLogService } from '../services/dispatch-log.service'
import { ReportCronService } from '../services/report-cron.service'

@ApiTags('Admin-Logs')
@Controller(routesV1.apiversion)
export class DispatchLogController {
  constructor(
    private readonly dispatchLogService: DispatchLogService,
    private readonly reportCron: ReportCronService
  ) { }

  @ApiOperation({ summary: 'Get dispatch logs (admin)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based). Default 1', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page. Default 20', example: 20 })
  @ApiQuery({ name: 'level', required: false, description: 'Log level filter. One of DEBUG, INFO, WARN, ERROR', example: 'INFO' })
  @ApiQuery({ name: 'query', required: false, description: 'Text search applied to message field (case-insensitive)', example: 'báo cáo' })
  @ApiBearerAuth()
  @UseGuards(JWTGuard, RolesGuard)
  @Roles(4)
  @Get('/admin/logs')
  async getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('level') level?: string,
    @Query('query') query?: string
  ) {
    return await this.dispatchLogService.findAll({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      level,
      query
    })
  }

  // @ApiOperation({ summary: 'Replay dispatch from a log entry (admin)' })
  // @ApiBearerAuth()
  // @UseGuards(JWTGuard, RolesGuard)
  // @Roles(4)
  // @Post('/admin/logs/:id/replay')
  // async replay(@Param('id') id: string) {
  //   const log = await this.dispatchLogService.findById(Number(id))
  //   if (!log) {
  //     throw new HttpException('Log not found', HttpStatus.NOT_FOUND)
  //   }

  //   const reportId = log.meta?.reportId
  //   if (!reportId) {
  //     throw new HttpException('Log meta missing reportId', HttpStatus.BAD_REQUEST)
  //   }

  //   try {
  //     await this.reportCron.triggerDispatchReport(Number(reportId))
  //     return { statusCode: 200, message: 'Replay triggered' }
  //   } catch (error) {
  //     throw new HttpException(error?.message || 'Replay failed', HttpStatus.INTERNAL_SERVER_ERROR)
  //   }
  // }
}


