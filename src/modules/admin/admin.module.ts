import { Module } from '@nestjs/common';
import { PrismaModule } from '../../libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';

// Controllers
import { GetEnterprisesMapController } from './controllers/get-enterprises-map.controller';
import { GiftController } from './controllers/gift.controller';
import { AdminViolationsController } from './controllers/admin-violations.controller';
import { AdminComplaintController } from './controllers/admin-complaint.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { SubscriptionPlanController } from './controllers/subscription-plan.controller';

// Services
import { GetEnterprisesMapService } from './services/get-enterprises-map.service';
import { GiftAdminService } from './services/gift-admin.service';
import { AdminComplaintService } from './services/admin-complaint.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { SubscriptionPlanService } from './services/subscription-plan.service';

import { SupabaseModule } from '../supabase/supabase.module';
import { NotificationModule } from '../notification/notification.module';

const httpController = [
  GetEnterprisesMapController,
  GiftController,
  AdminViolationsController,
  AdminComplaintController,
  AdminDashboardController,
  SubscriptionPlanController,
];

const Services = [
  GetEnterprisesMapService,
  GiftAdminService,
  AdminComplaintService,
  AdminDashboardService,
  SubscriptionPlanService,
];

@Module({
  imports: [PrismaModule, AuthModule, SupabaseModule, NotificationModule],
  controllers: [...httpController],
  providers: [...Services],
  exports: [GetEnterprisesMapService],
})
export class AdminModule {}
