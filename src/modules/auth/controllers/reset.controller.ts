import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { ResetService } from '../services/reset.service';

@ApiTags('Auth')
@Controller(routesV1.apiversion)
export class ResetController {
    constructor(private readonly resetService: ResetService) {}

    @ApiOperation({ summary: 'Reset password' })
    @Post(routesV1.auth.resetPassword)
    async reset(@Body() data: ResetPasswordDto) {
        return await this.resetService.resetPassword(data);
    }
}


