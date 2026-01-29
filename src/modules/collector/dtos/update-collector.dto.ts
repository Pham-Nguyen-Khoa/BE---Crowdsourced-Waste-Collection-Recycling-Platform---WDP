import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateCollectorDto {
    @ApiProperty({ example: 'Nguyễn Văn Collector Mới', description: 'Họ và tên collector' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    fullName?: string;

    @ApiProperty({ example: '0901234567', description: 'Số điện thoại', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ enum: ['AVAILABLE', 'ON_TASK', 'OFFLINE'], description: 'Trạng thái hoạt động' })
    @IsOptional()
    @IsEnum(['AVAILABLE', 'ON_TASK', 'OFFLINE'])
    status?: string;
}

