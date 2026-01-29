import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { ReportStatus } from "generated/prisma/enums";

export class GetReportsQueryDto {
    @ApiPropertyOptional({ enum: ReportStatus, description: 'Lọc theo trạng thái đơn' })
    @IsOptional()
    @IsEnum(ReportStatus)
    status?: ReportStatus;

    @ApiPropertyOptional({ description: 'Số trang', default: 1 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Số lượng mỗi trang', default: 10 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    limit?: number = 10;
}

export class PaginationMetaDto {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export class WasteItemDto {
    wasteType: string;
    weightKg: number;
}

export class ReportListItemDto {
    id: number;
    status: ReportStatus;
    address: string;
    provinceCode: string;
    districtCode: string;
    wardCode: string;
    description?: string;
    createdAt: Date;
    cancelReason?: string;
    wasteItems: WasteItemDto[];
    images: string[];
    enterpriseName?: string;
    collectorName?: string;
}

export class GetReportsResponseDto {
    items: ReportListItemDto[];
    meta: PaginationMetaDto;
}

