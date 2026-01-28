import { Global, Module } from '@nestjs/common';
import { CreateNotificationController } from './controllers/create-notification.controller';
import { GetAllNotificationController } from './controllers/get-all-notification.controller';
import { MarkReadNotificationController } from './controllers/mark-read-notification.controller';
import { BroadcastNotificationController } from './controllers/broadcast-notification.controller';
import { NotificationService } from './services/notification.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { PrismaModule } from 'src/libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

const httpController = [
    // CreateNotificationController,
    GetAllNotificationController,
    MarkReadNotificationController,
    BroadcastNotificationController,
]

const Services = [
    NotificationService,
    NotificationGateway,
]


@Global()
@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [...httpController],
    providers: [...Services],
    exports: [NotificationService, NotificationGateway]
})
export class NotificationModule { }

