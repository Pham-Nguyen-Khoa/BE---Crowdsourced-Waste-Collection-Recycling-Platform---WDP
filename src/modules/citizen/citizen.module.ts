import { Module } from '@nestjs/common';
import { ReportAssignmentService } from './services/report-assignment.service';
import { ReportCronService } from './services/report-cron.service';
import { DispatchLogService } from './services/dispatch-log.service';

import { PrismaModule } from '../../libs/prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/services/supabase.service';
import { AuthModule } from '../auth/auth.module';
import { MailerService } from '../auth/mail/mailer.service';
import { JwtService } from '@nestjs/jwt';
import { CreateReportController } from './controllers/create-report.controller';
import { DispatchModule } from '../dispatch/dispatch.module';
import { CronController } from './controllers/cron.controller';
import { DispatchLogController } from './controllers/dispatch-log.controller';
import { NotificationService } from '../notification/services/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { NotificationGateway } from '../notification/gateways/notification.gateway';
import { CreateReportService } from './services/create-report.service';
import { GetAllReportController } from './controllers/get-all-report.controller';
import { GetAllReportService } from './services/get-all-report.service';
import { GetDetailReportController } from './controllers/get-detail-report.controller';
import { GetDetailReportService } from './services/get-detail-report.service';
import { RewardService } from './services/reward.service';
import { CitizenPresenceService } from './services/citizen-presence.service';
import { CitizenPresenceController } from './controllers/citizen-presence.controller';
import { ComplaintController } from './controllers/complaint.controller';
import { LoyaltyController } from './controllers/loyalty.controller';
import { ComplaintService } from './services/complaint.service';
import { LoyaltyService } from './services/loyalty.service';
import { LeaderboardService } from './services/leaderboard.service';
import { LeaderboardController } from './controllers/leaderboard.controller';

const httpController = [
  GetAllReportController,
  GetDetailReportController,
  CreateReportController,
  CronController,
  DispatchLogController,
  CitizenPresenceController,
  ComplaintController,
  LoyaltyController,
  LeaderboardController,
];

const Repository = [];

const Services = [
  CreateReportService,
  ReportAssignmentService,
  ReportCronService,
  DispatchLogService,
  SupabaseService,
  MailerService,
  JwtService,
  GetAllReportService,
  GetDetailReportService,
  RewardService,
  CitizenPresenceService,
  ComplaintService,
  LoyaltyService,
  LeaderboardService,
  // NotificationService được cung cấp qua NotificationModule (đã import ở trên)
];

@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    AuthModule,
    DispatchModule,
    NotificationModule,
  ],
  controllers: [...httpController],
  providers: [...Services, ...Repository],
  exports: [CreateReportService, ReportAssignmentService],
})
export class CitizenModule {}
