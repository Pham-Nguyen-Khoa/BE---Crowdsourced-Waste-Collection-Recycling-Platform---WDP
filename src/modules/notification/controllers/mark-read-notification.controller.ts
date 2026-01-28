import { Controller, Patch, Param } from '@nestjs/common';
import { routesV1 } from 'src/configs/app.routes';
import { resourcesV1 } from 'src/configs/app.permission';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { GetUser } from 'src/modules/auth/guards/get-user.decorator';
import { User } from 'generated/prisma/client';

@ApiTags(`${resourcesV1.NOTIFICATION.parent}`)
@Controller(routesV1.apiversion)
export class MarkReadNotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @ApiOperation({ summary: resourcesV1.MARK_READ_NOTIFICATION.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard)
    @Patch(routesV1.notification.markRead.replace(':id', ':id'))
    async markRead(@Param('id') id: string, @GetUser() user) {
        return await this.notificationService.markRead(Number(id), user.id);
    }
}
