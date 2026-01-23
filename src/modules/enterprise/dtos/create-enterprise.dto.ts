import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsNumber, IsArray, Min, Max, ValidateNested, IsOptional } from "class-validator";
import { Type } from "class-transformer";

class ServiceAreaDto {
    @ApiProperty({ example: '01', description: 'Mã tỉnh/thành phố' })
    @IsString()
    @IsNotEmpty()
    provinceCode: string;

    @ApiProperty({ example: '001', description: 'Mã quận/huyện', required: false })
    @IsOptional()
    @IsString()
    districtCode?: string;

    @ApiProperty({ example: '00001', description: 'Mã phường/xã', required: false })
    @IsOptional()
    wardCode?: string;
}

class WasteTypeDto {
    @ApiProperty({ example: 'ORGANIC', enum: ['ORGANIC', 'RECYCLABLE', 'HAZARDOUS'], description: 'Loại rác xử lý' })
    @IsString()
    @IsNotEmpty()
    wasteType: 'ORGANIC' | 'RECYCLABLE' | 'HAZARDOUS';
}


export class CreateEnterpriseDto {
    @ApiProperty({ example: 'Công ty TNHH Môi trường Xanh', description: 'Tên doanh nghiệp' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: '123 Đường ABC, Quận 1, TP.HCM', description: 'Địa chỉ văn phòng' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty({ example: 10.762622, description: 'Vĩ độ' })
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty({ example: 106.660172, description: 'Kinh độ' })
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

    @ApiProperty({ example: 1000.50, description: 'Công suất xử lý (kg)' })
    @IsNumber()
    @Min(0)
    capacityKg: number;

    @ApiProperty({
        type: [ServiceAreaDto],
        example: [
            { provinceCode: '01', districtCode: '001', wardCode: '00001' },
            { provinceCode: '01', districtCode: '002' }
        ],
        description: 'Danh sách khu vực phục vụ'
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ServiceAreaDto)
    serviceAreas: ServiceAreaDto[];

    @ApiProperty({
        type: [WasteTypeDto],
        example: [
            { wasteType: 'ORGANIC' },
            { wasteType: 'RECYCLABLE' }
        ],
        description: 'Danh sách loại rác xử lý'
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WasteTypeDto)
    wasteTypes: WasteTypeDto[];


    @ApiProperty({ example: 1, description: 'ID gói subscription (1: 1 tháng, 2: 6 tháng, 3: 1 năm)' })
    @IsNumber()
    subscriptionPlanConfigId: number;
}
