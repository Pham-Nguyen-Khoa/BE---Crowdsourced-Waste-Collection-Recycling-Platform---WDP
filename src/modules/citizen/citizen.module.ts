import { Module } from '@nestjs/common'
import { CitizenController } from './controllers/citizen.controller'
import { CitizenService } from './services/citizen.service'
import { ReportDispatcherService } from './services/report-dispatcher.service'
import { ReportCronService } from './services/report-cron.service'
import { PrismaModule } from '../../libs/prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { SupabaseModule } from '../supabase/supabase.module'
import { ScheduleModule } from '@nestjs/schedule'
import { DateHelper } from 'src/helper/date.helper'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SupabaseModule,
    ScheduleModule.forRoot() // Enable cron jobs
  ],
  controllers: [CitizenController],
  providers: [
    CitizenService,
    ReportDispatcherService,
    ReportCronService,
    DateHelper,
  ],
  exports: [CitizenService],
})
export class CitizenModule { }
