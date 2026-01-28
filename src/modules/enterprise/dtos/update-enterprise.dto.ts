import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsNumber, IsArray, Min, Max, ValidateNested, IsOptional } from "class-validator";
import { Type } from "class-transformer";

class ServiceAreaDto {
    @ApiProperty({ example: '01', description: 'Mã tỉnh/thành phố' })
    @IsString()
    @IsNotEmpty()
    provinceCode: string;

    @ApiPropertyOptional({ example: '001', description: 'Mã quận/huyện' })
    @IsOptional()
    @IsString()
    districtCode?: string;

    @ApiPropertyOptional({ example: '00001', description: 'Mã phường/xã' })
    @IsOptional()
    @IsString()
    wardCode?: string;
}

class WasteTypeDto {
    @ApiProperty({ example: 'ORGANIC', description: 'Loại rác xử lý' })
    @IsString()
    @IsNotEmpty()
    wasteType: string;
}

export class UpdateEnterpriseDto {
    @ApiPropertyOptional({ example: 'Công ty TNHH Môi trường Xanh', description: 'Tên doanh nghiệp' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @ApiPropertyOptional({ example: '123 Đường ABC, Quận 1, TP.HCM', description: 'Địa chỉ văn phòng' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    address?: string;

    @ApiPropertyOptional({ example: 10.762622, description: 'Vĩ độ' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional({ example: 106.660172, description: 'Kinh độ' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(-180)
    @Max(180)
    longitude?: number;

    @ApiPropertyOptional({ example: 1000.50, description: 'Công suất xử lý (kg)' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    capacityKg?: number;

    @ApiPropertyOptional({
        type: [ServiceAreaDto],
        example: [
            { provinceCode: '01', districtCode: '001', wardCode: '00001' }
        ],
        description: 'Danh sách khu vực phục vụ'
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ServiceAreaDto)
    serviceAreas?: ServiceAreaDto[];

    @ApiPropertyOptional({
        type: [WasteTypeDto],
        example: [
            { wasteType: 'ORGANIC' }
        ],
        description: 'Danh sách loại rác xử lý'
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WasteTypeDto)
    wasteTypes?: WasteTypeDto[];
}

export class EnterpriseProfileResponseDto {
    @ApiProperty({ example: 1 })
    id: number

    @ApiProperty({ example: 'Công ty TNHH Môi trường Xanh' })
    name: string

    @ApiProperty({ example: '123 Đường ABC, Quận 1, TP.HCM' })
    address: string

    @ApiProperty({ example: 10.762622 })
    latitude: number

    @ApiProperty({ example: 106.660172 })
    longitude: number

    @ApiProperty({ example: 1000 })
    capacityKg: number

    @ApiProperty({ example: 'ACTIVE' })
    status: string

    @ApiPropertyOptional({ description: 'URL logo' })
    logo?: string

    @ApiProperty({ type: [ServiceAreaDto] })
    serviceAreas: ServiceAreaDto[]

    @ApiProperty({ type: [WasteTypeDto] })
    wasteTypes: WasteTypeDto[]

    @ApiProperty({ example: '2026-01-26T00:00:00.000Z' })
    createdAt: Date
}
