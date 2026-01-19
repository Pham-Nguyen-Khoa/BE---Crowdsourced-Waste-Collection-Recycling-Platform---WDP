import { Body, Controller, Post } from "@nestjs/common";
import { routesV1 } from "src/configs/app.routes";
import { resourcesV1 } from "src/configs/app.permission";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LoginDto } from "../dtos/login.dto";
import { SignupDto } from "../dtos/signup.dto";
import { RefreshDto } from "../dtos/refresh.dto";
import { ForgotPasswordDto } from "../dtos/forgot-password.dto";
import { VerifyOtpDto } from "../dtos/verify-otp.dto";
import { ResetPasswordDto } from "../dtos/reset-password.dto";
import { LoginService } from "../services/login.service";
import { JWTGuard } from "../guards/jwt.guard";


@ApiTags(
    `${resourcesV1.LOGIN.parent}`,
)
@Controller(routesV1.apiversion)
export class LoginController {
    constructor(private readonly loginService: LoginService) { }
    @ApiOperation({ summary: resourcesV1.LOGIN.displayName })
    @Post(routesV1.auth.login)
    async login(@Body() data: LoginDto) {
        return await this.loginService.login(data);
    }

}