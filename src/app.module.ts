import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { CitizenModule } from './modules/citizen/citizen.module';

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

    /* ---------------- End Module---------------- */
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }


