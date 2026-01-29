import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export enum CollectorAvailabilityFilter {
    AVAILABLE = 'AVAILABLE',
    ON_TASK = 'ON_TASK',
    OFFLINE = 'OFFLINE',
}

export class GetCollectorsQueryDto {
    @ApiPropertyOptional({ enum: CollectorAvailabilityFilter, description: 'Lọc theo trạng thái hoạt động' })
    @IsOptional()
    @IsEnum(CollectorAvailabilityFilter)
    status?: CollectorAvailabilityFilter;

    @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc email', example: 'nguyen' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Số trang', example: 1, default: 1 })
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({ description: 'Số lượng mỗi trang', example: 10, default: 10 })
    @IsOptional()
    limit?: number;
}

