import { Module } from '@nestjs/common';
import { PrismaModule } from '../../libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';

// Controllers
import { GetEnterprisesMapController } from './controllers/get-enterprises-map.controller';
import { GiftController } from './controllers/gift.controller';

// Services
import { GetEnterprisesMapService } from './services/get-enterprises-map.service';
import { GiftAdminService } from './services/gift-admin.service';

import { SupabaseModule } from '../supabase/supabase.module';

const httpController = [GetEnterprisesMapController, GiftController];

const Services = [GetEnterprisesMapService, GiftAdminService];

@Module({
  imports: [PrismaModule, AuthModule, SupabaseModule],
  controllers: [...httpController],
  providers: [...Services],
  exports: [GetEnterprisesMapService],
})
export class AdminModule {}
