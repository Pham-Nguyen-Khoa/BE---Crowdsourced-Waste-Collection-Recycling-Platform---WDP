import { Module } from '@nestjs/common';
import { LoginController } from './controllers/login.controller';
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
import { JWTGuard } from './guards/jwt.guard';
import { OptionalJWTGuard } from './guards/optional-jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionGuard } from './guards/permissions.guard';
import { EnterpriseRoleGuard } from '../collector/guards/enterprise-role.guard';
import { CollectorRoleGuard } from '../collector/guards/collector-role.guard';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './repositories/auth.repository';
import { PrismaModule } from 'src/libs/prisma/prisma.module';

const httpController = [
  LoginController,
  SignupController,
  RefreshController,
  ForgotController,
  VerifyController,
  ResetController,
];

const Repository = [AuthRepository];

const Services = [
  LoginService,
  SignupService,
  RefreshService,
  ForgotService,
  VerifyService,
  ResetService,
  MailerService,
  JwtService,
  JWTGuard,
  OptionalJWTGuard,
  RolesGuard,
  PermissionGuard,
  EnterpriseRoleGuard,
  CollectorRoleGuard,
];

@Module({
  imports: [PrismaModule],
  controllers: [...httpController],
  providers: [...Services, ...Repository],
  exports: [
    AuthRepository,
    MailerService,
    JwtService,
    JWTGuard,
    OptionalJWTGuard,
    RolesGuard,
    PermissionGuard,
    EnterpriseRoleGuard,
    CollectorRoleGuard,
  ],
})
export class AuthModule {}
