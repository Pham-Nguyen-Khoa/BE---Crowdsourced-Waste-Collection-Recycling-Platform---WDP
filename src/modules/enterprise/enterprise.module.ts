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


const httpController = [
    EnterpriseController,
    EnterpriseAcceptedController,
    EnterpriseRejectedController
]


const Repository = [
    EnterpriseRepository
]

const Services = [
    EnterpriseService,
    EnterpriseScheduler,
    ReportAssignmentService,

    MailerService,
    JwtService,
]

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [...httpController],
    providers: [...Services, ...Repository],
    exports: [EnterpriseService, EnterpriseRepository]
})
export class EnterpriseModule { }
