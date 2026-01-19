import { Module } from '@nestjs/common';
import { LoginController } from './controllers/login.controller';
import { UserController } from './controllers/user.controller';
import { SignupController } from './controllers/signup.controller';
import { RefreshController } from './controllers/refresh.controller';
import { ForgotController } from './controllers/forgot.controller';
import { VerifyController } from './controllers/verify.controller';
import { ResetController } from './controllers/reset.controller';
import { LoginService } from './services/login.service';
import { SignupService } from './services/signup.service';
import { RefreshService } from './services/refresh.service';
import { ForgotService } from './services/forgot.service';
import { VerifyService } from './services/verify.service';
import { ResetService } from './services/reset.service';
import { MailerService } from './mail/mailer.service';
// import { PrismaModule } from 'src/libs/prisma/prisma.module';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './repositories/auth.repository';
import { PrismaModule } from 'src/libs/prisma/prisma.module';

const httpController = [
    LoginController,
    UserController,
    SignupController,
    RefreshController,
    ForgotController,
    VerifyController,
    ResetController,
    // TestController
]



const Repository = [
    AuthRepository
]


const Services = [
    LoginService,
    SignupService,
    RefreshService,
    ForgotService,
    VerifyService,
    ResetService,
    MailerService,
    JwtService,
]

@Module({
    imports: [PrismaModule],
    // imports: [],
    controllers: [...httpController],
    providers: [...Services, ...Repository],
    exports: [AuthRepository, JwtService]
})
export class AuthModule { }     
