import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EnterpriseController } from './controllers/enterprise.controller';
import { EnterpriseService } from './services/enterprise.service';
import { EnterpriseRepository } from './repositories/enterprise.repository';
import { EnterpriseScheduler } from './schedulers/enterprise.scheduler';
import { PrismaModule } from 'src/libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EnterpriseAcceptedController } from './controllers/enterprise-accepted.controller';
import { ReportAssignmentService } from '../citizen/services/report-assignment.service';
import { EnterpriseRejectedController } from './controllers/enterprise-rejected.controller';
import { MailerService } from '../auth/mail/mailer.service';
import { JwtService } from '@nestjs/jwt';
import { GetAllReportWaitingController } from './controllers/get-all-report-waiting.controller';
import { GetDetailReportWaitingController } from './controllers/get-detail-report-waiting.controller';
import { GetDetailReportWaitingService } from './services/get-detail-report-waiting.service';
import { ToggleOrderAcceptanceController } from './controllers/toggle-order-acceptance.controller';
import { ToggleOrderAcceptanceService } from './services/toggle-order-acceptance.service';


const httpController = [
    EnterpriseController,
    EnterpriseAcceptedController,
    EnterpriseRejectedController,
    GetAllReportWaitingController,
    GetDetailReportWaitingController,
    ToggleOrderAcceptanceController,
]


const Repository = [
    EnterpriseRepository
]

const Services = [
    EnterpriseService,
    EnterpriseScheduler,
    ReportAssignmentService,
    GetDetailReportWaitingService,
    ToggleOrderAcceptanceService,

    MailerService,
    JwtService,
]

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [...httpController],
    providers: [...Services, ...Repository],
    exports: [EnterpriseService, EnterpriseRepository, ToggleOrderAcceptanceService]
})
export class EnterpriseModule { }
