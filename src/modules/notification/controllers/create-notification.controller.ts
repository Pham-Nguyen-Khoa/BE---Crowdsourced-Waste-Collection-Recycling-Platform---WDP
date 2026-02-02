import { Body, Controller, Post } from '@nestjs/common';
import { routesV1 } from 'src/configs/app.routes';
import { resourcesV1, PermissionCode } from 'src/configs/app.permission';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { NotificationService } from '../services/notification.service';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permissions.guard';
import { UseGuards } from '@nestjs/common';
import { Permissions } from 'src/modules/auth/guards/permission.decorator';

@ApiTags(`${resourcesV1.NOTIFICATION.parent}`)
@Controller(routesV1.apiversion)
export class CreateNotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @ApiOperation({ summary: resourcesV1.CREATE_NOTIFICATION.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, PermissionGuard)
    @Permissions(PermissionCode.CREATE_NOTIFICATION)
    @Post(routesV1.notification.create)
    async create(@Body() dto: CreateNotificationDto) {
        // create + push realtime via socket
        return await this.notificationService.createAndNotify(dto);
    }
}
