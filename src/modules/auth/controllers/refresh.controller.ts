import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { RefreshDto } from '../dtos/refresh.dto';
import { RefreshService } from '../services/refresh.service';

@ApiTags('Auth')
@Controller(routesV1.apiversion)
export class RefreshController {
    constructor(private readonly refreshService: RefreshService) {}

    @ApiOperation({ summary: 'Refresh token' })
    @Post(routesV1.auth.refresh)
    async refresh(@Body() data: RefreshDto) {
        return await this.refreshService.refresh(data);
    }
}


