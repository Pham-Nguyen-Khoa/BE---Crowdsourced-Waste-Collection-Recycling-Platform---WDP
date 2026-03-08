import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { CitizenModule } from './modules/citizen/citizen.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CollectorModule } from './modules/collector/collector.module';
import { AdminModule } from './modules/admin/admin.module';
import { ZoneModule } from './modules/zone/zone.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    // Config ENV
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    /* ----------------Module---------------- */
    AuthModule,
    EnterpriseModule,
    SupabaseModule,
    CitizenModule,
    NotificationModule,
    ProfileModule,
    CollectorModule,
    AdminModule,
    ZoneModule,
    DispatchModule,

    /* ---------------- End Module---------------- */
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
