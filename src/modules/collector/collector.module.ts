import { Module } from '@nestjs/common';
import { PrismaModule } from '../../libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MailerService } from '../auth/mail/mailer.service';
import { JwtService } from '@nestjs/jwt';

// Controllers
import { CreateCollectorController } from './controllers/create-collector.controller';
import { GetAllCollectorController } from './controllers/get-all-collector.controller';
import { GetCollectorDetailController } from './controllers/get-collector-detail.controller';
import { UpdateCollectorController } from './controllers/update-collector.controller';
import { DeleteCollectorController } from './controllers/delete-collector.controller';

// Services
import { CreateCollectorService } from './services/create-collector.service';
import { GetAllCollectorService } from './services/get-all-collector.service';
import { GetCollectorDetailService } from './services/get-collector-detail.service';
import { UpdateCollectorService } from './services/update-collector.service';
import { DeleteCollectorService } from './services/delete-collector.service';

const httpController = [
    CreateCollectorController,
    GetAllCollectorController,
    GetCollectorDetailController,
    UpdateCollectorController,
    DeleteCollectorController,
];

const Services = [
    CreateCollectorService,
    GetAllCollectorService,
    GetCollectorDetailService,
    UpdateCollectorService,
    DeleteCollectorService,
    MailerService,
    JwtService,
];

@Module({
    imports: [
        PrismaModule,
        AuthModule,
    ],
    controllers: [...httpController],
    providers: [...Services],
    exports: [CreateCollectorService, GetAllCollectorService],
})
export class CollectorModule { }
