import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsArray, ArrayMinSize } from 'class-validator'
import { Transform } from 'class-transformer'
import { NotificationType } from 'generated/prisma/enums'



export class CreateNotificationDto {
    @ApiProperty({
        example: 1,
        description: 'ID của người dùng nhận thông báo'
    })
    @IsNumber()
    @IsNotEmpty()
    userId: number

    @ApiProperty({
        example: 'Thông báo mới',
        description: 'Tiêu đề thông báo'
    })
    @IsString()
    @IsNotEmpty()
    title: string

    @ApiProperty({
        example: 'Bạn có một thông báo mới từ hệ thống',
        description: 'Nội dung thông báo'
    })
    @IsString()
    @IsNotEmpty()
    content: string

    @ApiPropertyOptional({
        example: 'SYSTEM',
        description: 'Loại thông báo',
        enum: NotificationType,
        default: NotificationType.SYSTEM
    })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType

    @ApiPropertyOptional({
        example: { reportId: 123, action: 'created' },
        description: 'Metadata bổ sung (JSON object)'
    })
    @IsOptional()
    meta?: Record<string, any>
}

export class GetNotificationsQueryDto {
    @ApiPropertyOptional({
        example: 1,
        description: 'Số trang',
        default: 1
    })
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value) || 1)
    page?: number = 1

    @ApiPropertyOptional({
        example: 20,
        description: 'Số lượng bản ghi mỗi trang',
        default: 20
    })
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => Number(value) || 20)
    limit?: number = 20

    @ApiPropertyOptional({
        example: true,
        description: 'Lọc thông báo đã đọc (true = đã đọc, false = chưa đọc, không truyền = lấy tất cả)'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : undefined)
    isRead?: boolean
}

export class MarkReadParamDto {
    @ApiProperty({
        example: 1,
        description: 'ID của thông báo'
    })
    @IsNumber()
    id: number
}

/**
 * DTO cho việc gửi thông báo cho nhiều users
 */
export class BroadcastNotificationDto {
    @ApiProperty({
        example: [1, 2, 3],
        description: 'Danh sách user IDs'
    })
    @IsNotEmpty()
    @IsArray()
    @ArrayMinSize(1)
    userIds: number[]

    @ApiProperty({
        example: 'Thông báo quan trọng',
        description: 'Tiêu đề thông báo'
    })
    @IsString()
    @IsNotEmpty()
    title: string

    @ApiProperty({
        example: 'Đây là nội dung thông báo gửi cho nhiều người',
        description: 'Nội dung thông báo'
    })
    @IsString()
    @IsNotEmpty()
    content: string

    @ApiPropertyOptional({
        example: 'SYSTEM',
        description: 'Loại thông báo',
        enum: NotificationType
    })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType

    @ApiPropertyOptional({
        example: { important: true },
        description: 'Metadata bổ sung'
    })
    @IsOptional()
    meta?: Record<string, any>
}

/**
 * DTO cho việc gửi thông báo cho TẤT CẢ users
 */
export class BroadcastAllNotificationDto {
    @ApiProperty({
        example: 'Thông báo hệ thống',
        description: 'Tiêu đề thông báo'
    })
    @IsString()
    @IsNotEmpty()
    title: string

    @ApiProperty({
        example: 'Thông báo này được gửi đến tất cả người dùng',
        description: 'Nội dung thông báo'
    })
    @IsString()
    @IsNotEmpty()
    content: string

    // @ApiPropertyOptional({
    //     example: 'SYSTEM',
    //     description: 'Loại thông báo',
    //     enum: NotificationType
    // })
    // @IsOptional()
    // @IsEnum(NotificationType)
    // type?: NotificationType

    @ApiPropertyOptional({
        example: { broadcast: true },
        description: 'Metadata bổ sung'
    })
    @IsOptional()
    meta?: Record<string, any>
}

/**
 * DTO cho việc gửi thông báo theo role
 */
export class BroadcastByRoleDto {
    @ApiProperty({
        example: 'ADMIN',
        description: 'Role của người dùng (ADMIN, USER, ENTERPRISE,...)'
    })
    @IsString()
    @IsNotEmpty()
    role: string

    @ApiProperty({
        example: 'Thông báo cho Admin',
        description: 'Tiêu đề thông báo'
    })
    @IsString()
    @IsNotEmpty()
    title: string

    @ApiProperty({
        example: 'Nội dung thông báo dành cho admin',
        description: 'Nội dung thông báo'
    })
    @IsString()
    @IsNotEmpty()
    content: string

    @ApiPropertyOptional({
        example: 'SYSTEM',
        description: 'Loại thông báo',
        enum: NotificationType
    })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType

    @ApiPropertyOptional({
        example: { roleNotification: true },
        description: 'Metadata bổ sung'
    })
    @IsOptional()
    meta?: Record<string, any>
}

