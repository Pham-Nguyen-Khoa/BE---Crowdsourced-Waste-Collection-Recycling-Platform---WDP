import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CollectorResponseDto {
    @ApiProperty({ description: 'ID collector', example: 1 })
    id: number;

    @ApiProperty({ description: 'Họ và tên', example: 'Nguyễn Văn A' })
    fullName: string;

    @ApiPropertyOptional({ description: 'Email', example: 'collector@example.com' })
    email: string;

    @ApiPropertyOptional({ description: 'Số điện thoại', example: '0901234567' })
    phone?: string;

    @ApiPropertyOptional({ description: 'Ảnh đại diện', example: 'https://...' })
    avatar?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', example: 'AVAILABLE' })
    availabilityStatus?: string;

    @ApiPropertyOptional({ description: 'Ngày tạo', example: '2026-01-29T10:00:00.000Z' })
    createdAt: Date;
}

