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

@Module({
  imports: [
    // Config ENV
    ConfigModule.forRoot({
      isGlobal: true
    }),

    /* ----------------Module---------------- */
    AuthModule,
    EnterpriseModule,
    SupabaseModule,
    CitizenModule,
    NotificationModule,
    ProfileModule,
    CollectorModule,
    AdminModule,

    /* ---------------- End Module---------------- */
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }


