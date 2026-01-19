import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';
import { VerifyService } from '../services/verify.service';

@ApiTags('Auth')
@Controller(routesV1.apiversion)
export class VerifyController {
    constructor(private readonly verifyService: VerifyService) {}

    @ApiOperation({ summary: 'Verify OTP' })
    @Post(routesV1.auth.veifyOTP)
    async verify(@Body() data: VerifyOtpDto) {
        return await this.verifyService.verifyOtp(data);
    }
}


