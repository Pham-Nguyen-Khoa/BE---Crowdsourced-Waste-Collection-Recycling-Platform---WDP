import { Body, Controller, Post } from '@nestjs/common';
import { routesV1 } from 'src/configs/app.routes';
import { resourcesV1 } from 'src/configs/app.permission';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BroadcastAllNotificationDto } from '../dtos/create-notification.dto';
import { NotificationService } from '../services/notification.service';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

@ApiTags(`${resourcesV1.NOTIFICATION.parent}`)
@Controller(routesV1.apiversion)
export class BroadcastNotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @ApiOperation({ summary: resourcesV1.BROADCAST_ALL_NOTIFICATION.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, RolesGuard)
    @Roles(4)
    @Post(routesV1.notification.broadcastAll)
    async broadcast(@Body() dto: BroadcastAllNotificationDto) {
        return await this.notificationService.broadcastToAll(dto);
    }
}

