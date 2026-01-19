import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { SignupDto } from '../dtos/signup.dto';
import { SignupService } from '../services/signup.service';

@ApiTags('Auth')
@Controller(routesV1.apiversion)
export class SignupController {
    constructor(private readonly signupService: SignupService) {}

    @ApiOperation({ summary: 'Signup' })
    @Post(routesV1.auth.signup)
    async signup(@Body() data: SignupDto) {
        return await this.signupService.signup(data);
    }
}


