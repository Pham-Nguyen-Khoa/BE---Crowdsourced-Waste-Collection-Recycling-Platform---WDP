import { Module } from '@nestjs/common'
import { ReportAssignmentService } from './services/report-assignment.service'
import { ReportCronService } from './services/report-cron.service'

import { PrismaModule } from '../../libs/prisma/prisma.module'
import { ScheduleModule } from '@nestjs/schedule'
import { SupabaseService } from '../supabase/services/supabase.service'
import { AuthModule } from '../auth/auth.module'
import { MailerService } from '../auth/mail/mailer.service'
import { JwtService } from '@nestjs/jwt'
import { CreateReportController } from './controllers/create-report.controller'
import { CronController } from './controllers/cron.controller'
import { CreateReportService } from './services/create-report.service'


const httpController = [
  CreateReportController,
  CronController
]



const Repository = [
]


const Services = [
  CreateReportService,
  ReportAssignmentService,
  ReportCronService,
  SupabaseService,
  MailerService,
  JwtService,
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
  exports: [CreateReportService],
})
export class CitizenModule { }
