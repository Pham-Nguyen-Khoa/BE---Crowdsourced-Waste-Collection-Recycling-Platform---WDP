import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EnterpriseController } from './controllers/enterprise.controller';
import { EnterpriseService } from './services/enterprise.service';
import { EnterpriseRepository } from './repositories/enterprise.repository';
import { EnterpriseScheduler } from './schedulers/enterprise.scheduler';
import { PrismaModule } from 'src/libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule],
    controllers: [EnterpriseController],
    providers: [EnterpriseService, EnterpriseRepository, EnterpriseScheduler],
    exports: [EnterpriseService, EnterpriseRepository]
})
export class EnterpriseModule { }
