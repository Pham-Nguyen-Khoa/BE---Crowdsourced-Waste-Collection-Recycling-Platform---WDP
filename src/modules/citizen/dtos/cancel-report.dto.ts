import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, Min } from 'class-validator'

export class CancelReportDto {
    // @ApiProperty({ example: 1, description: 'ID của report cần hủy' })
    // @IsNumber()
    // @Min(1)
    // @IsNotEmpty()
    // reportId: number

    @ApiPropertyOptional({ example: 'Tôi không có nhu cầu nữa', description: 'Lý do hủy' })
    cancelReason?: string
}

export class CancelReportResponseDto {
    @ApiProperty({ example: 1 })
    reportId: number

    @ApiProperty({ example: 'CANCELLED' })
    status: string

    @ApiProperty({ example: 'Hủy báo cáo thành công' })
    message: string
}

