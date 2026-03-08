import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { ZoneModule } from '../zone/zone.module';

// Controllers
import { CollectorController } from './controllers/collector.controller';
import { EnterpriseCollectorController } from './controllers/enterprise-collector.controller';

// Services
import { CollectorService } from './services/collector.service';
import { GetAllCollectorService } from './services/get-all-collector.service';
import { GetCollectorDetailService } from './services/get-collector-detail.service';
import { UpdateCollectorStatusService } from './services/update-status.service';
import { SupabaseService } from '../supabase/services/supabase.service';

const Services = [
  CollectorService,
  GetAllCollectorService,
  GetCollectorDetailService,
  UpdateCollectorStatusService,
  SupabaseService
];

@Module({
  imports: [PrismaModule, AuthModule, DispatchModule, ZoneModule],
  controllers: [CollectorController, EnterpriseCollectorController],
  providers: [...Services],
  exports: [...Services],
})
export class CollectorModule { }
