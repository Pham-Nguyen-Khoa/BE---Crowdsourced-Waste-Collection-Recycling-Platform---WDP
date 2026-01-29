import { Module } from '@nestjs/common';
import { PrismaModule } from '../../libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';

// Controllers
import { GetEnterprisesMapController } from './controllers/get-enterprises-map.controller';

// Services
import { GetEnterprisesMapService } from './services/get-enterprises-map.service';

const httpController = [
    GetEnterprisesMapController,
];

const Services = [
    GetEnterprisesMapService,
];

@Module({
    imports: [
        PrismaModule,
        AuthModule,
    ],
    controllers: [...httpController],
    providers: [...Services],
    exports: [GetEnterprisesMapService],
})
export class AdminModule { }

