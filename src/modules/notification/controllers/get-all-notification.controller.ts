import { Controller, Get, Query } from '@nestjs/common';
import { routesV1 } from 'src/configs/app.routes';
import { resourcesV1 } from 'src/configs/app.permission';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetNotificationsQueryDto } from '../dtos/create-notification.dto';
import { NotificationService } from '../services/notification.service';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { GetUser } from 'src/modules/auth/guards/get-user.decorator';

@ApiTags(`${resourcesV1.NOTIFICATION.parent}`)
@Controller(routesV1.apiversion)
export class GetAllNotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @ApiOperation({ summary: resourcesV1.GET_NOTIFICATIONS.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard)
    @Get(routesV1.notification.getAll)
    async getAll(
        @GetUser() user,
        @Query() query: GetNotificationsQueryDto
    ) {
        return await this.notificationService.findAllByUser(
            user.id,
            query.page || 1,
            query.limit || 20,
            query.isRead  // undefined = all, true = read, false = unread
        );
    }
}
