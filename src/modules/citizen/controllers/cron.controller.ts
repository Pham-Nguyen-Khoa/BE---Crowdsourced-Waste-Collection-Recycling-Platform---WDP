import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReportCronService } from '../services/report-cron.service';

@ApiTags('Cron Jobs')
@Controller('cron')
export class CronController {
    constructor(private readonly cronService: ReportCronService) { }

    @Post('process-pending-reports')
    @ApiOperation({ summary: 'Trigger processing of pending reports (Cron Job)' })
    @ApiResponse({ status: 200, description: 'Reports processed successfully' })
    async processPendingReports() {
        return await this.cronService.triggerProcessPendingReports();
    }

    @Post('handle-timeout-attempts')
    @ApiOperation({ summary: 'Trigger handling of timeout attempts (Cron Job)' })
    @ApiResponse({ status: 200, description: 'Timeout attempts handled successfully' })
    async handleTimeoutAttempts() {
        return await this.cronService.triggerHandleTimeoutAttempts();
    }
}
