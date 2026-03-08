import { Module } from '@nestjs/common';
import { PrismaModule } from '../../libs/prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from '../notification/notification.module';
import { DispatchService } from './services/dispatch.service';
import { CollectorTaskService } from './services/collector-task.service';
import { AttemptTimeoutScheduler } from './schedulers/attempt-timeout.scheduler';
import { CollectorActivityService } from './services/collector-activity.service';
import { CollectorQueueService } from './services/collector-queue.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [PrismaModule, ScheduleModule, NotificationModule, SupabaseModule],
  providers: [
    DispatchService,
    CollectorTaskService,
    AttemptTimeoutScheduler,
    CollectorActivityService,
    CollectorQueueService,
  ],
  exports: [
    DispatchService,
    CollectorTaskService,
    CollectorActivityService,
    CollectorQueueService,
  ],
})
export class DispatchModule {}
