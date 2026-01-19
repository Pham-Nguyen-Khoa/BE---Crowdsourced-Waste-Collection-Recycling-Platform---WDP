import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ForgotService } from '../services/forgot.service';

@ApiTags('Auth')
@Controller(routesV1.apiversion)
export class ForgotController {
    constructor(private readonly forgotService: ForgotService) {}

    @ApiOperation({ summary: 'Forgot password - request OTP' })
    @Post(routesV1.auth.forgotPassword)
    async forgot(@Body() data: ForgotPasswordDto) {
        return await this.forgotService.forgotPassword(data);
    }
}


