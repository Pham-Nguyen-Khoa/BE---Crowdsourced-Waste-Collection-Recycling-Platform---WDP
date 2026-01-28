import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { CreateNotificationDto, BroadcastAllNotificationDto } from '../dtos/create-notification.dto';
import { NotificationType } from '@prisma/client';
import { errorResponse, successResponse } from 'src/common/utils/response.util';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Tạo notification cho 1 user (dùng nội bộ)
     */
    async create(dto: CreateNotificationDto) {
        const record = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                type: dto.type || NotificationType.SYSTEM,
                title: dto.title,
                content: dto.content,
                meta: dto.meta || undefined,
            },
        });
        return record;
    }

    /**
     * Gửi thông báo cho TẤT CẢ users trong hệ thống (Admin broadcast)
     * Loại trừ admin (roleId = 4)
     */
    async broadcastToAll(dto: BroadcastAllNotificationDto) {
        const users = await this.prisma.user.findMany({
            where: {
                roleId: {
                    not: 4
                }
            },
            select: { id: true },
        });

        const userIds = users.map(u => u.id);

        const notifications = await Promise.all(
            userIds.map(userId =>
                this.prisma.notification.create({
                    data: {
                        userId,
                        type: NotificationType.SYSTEM,
                        title: dto.title,
                        content: dto.content,
                        meta: dto.meta || undefined,
                    },
                })
            )
        );

        return successResponse(200, {
            totalUsers: users.length,
            totalNotifications: notifications.length,
        }, `Broadcast to ${notifications.length} users`);
    }



    async findAllByUser(userId: number, page = 1, limit = 20, isRead?: boolean) {
        const take = Math.min(limit, 100);
        const skip = (page - 1) * take;
        const where: any = {
            userId,
        };

        // Chỉ filter khi có truyền isRead (true = đã đọc, false = chưa đọc)
        if (isRead !== undefined) {
            where.isRead = isRead;
        }

        const [data, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.notification.count({ where }),
        ]);
        const result = {
            data,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        }
        return successResponse(200, result, 'Notifications fetched successfully');

    }

    async markRead(id: number, userId: number) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            return errorResponse(400, 'Notification không tồn tại hoặc không thuộc về bạn');

        }

        await this.prisma.notification.update({
            where: { id },
            data: { isRead: true, readAt: new Date() },
        });

        return successResponse(200, null, 'Notification đã được đánh dấu đã đọc');
    }

    async remove(id: number, userId: number) {
        // Kiểm tra notification có tồn tại và thuộc về user không
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            return errorResponse(400, 'Notification không tồn tại hoặc không thuộc về bạn');
        }

        await this.prisma.notification.delete({
            where: { id },
        });

        return successResponse(200, null, 'Notification đã được xóa');
    }
}
