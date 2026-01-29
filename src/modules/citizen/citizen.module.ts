import { Module } from '@nestjs/common'
import { ReportAssignmentService } from './services/report-assignment.service'
import { ReportCronService } from './services/report-cron.service'
import { DispatchLogService } from './services/dispatch-log.service'

import { PrismaModule } from '../../libs/prisma/prisma.module'
import { ScheduleModule } from '@nestjs/schedule'
import { SupabaseService } from '../supabase/services/supabase.service'
import { AuthModule } from '../auth/auth.module'
import { MailerService } from '../auth/mail/mailer.service'
import { JwtService } from '@nestjs/jwt'
import { CreateReportController } from './controllers/create-report.controller'
import { CronController } from './controllers/cron.controller'
import { DispatchLogController } from './controllers/dispatch-log.controller'
import { NotificationService } from '../notification/services/notification.service'
import { NotificationGateway } from '../notification/gateways/notification.gateway'
import { CreateReportService } from './services/create-report.service'
import { GetAllReportController } from './controllers/get-all-report.controller'
import { GetAllReportService } from './services/get-all-report.service'
import { GetDetailReportController } from './controllers/get-detail-report.controller'
import { GetDetailReportService } from './services/get-detail-report.service'


const httpController = [
  GetAllReportController,
  GetDetailReportController,
  CreateReportController,
  CronController,
  DispatchLogController,

]



const Repository = [
]


const Services = [
  CreateReportService,
  ReportAssignmentService,
  ReportCronService,
  DispatchLogService,
  NotificationService,
  SupabaseService,
  MailerService,
  JwtService,
  GetAllReportService,
  GetDetailReportService
]



@Module({
  imports: [
    PrismaModule,
    // ScheduleModule.forRoot(),
    AuthModule

  ],
  controllers: [...httpController],
  providers: [
    ...Services,
    ...Repository,
  ],
  exports: [CreateReportService,ReportAssignmentService],
})
export class CitizenModule { }
