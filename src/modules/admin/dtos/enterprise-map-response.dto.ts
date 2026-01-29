import { ApiProperty } from "@nestjs/swagger";
import { EnterpriseStatus } from "generated/prisma/enums";

export class EnterpriseMapResponseDto {
    @ApiProperty({ description: 'ID doanh nghiệp', example: 1 })
    id: number;

    @ApiProperty({ description: 'Tên doanh nghiệp', example: 'Công ty TNHH Môi trường Xanh' })
    name: string;

    @ApiProperty({ description: 'Địa chỉ', example: '123 Đường ABC, Quận 1, TP.HCM' })
    address: string;

    @ApiProperty({ description: 'Vĩ độ', example: 10.762622 })
    latitude: number;

    @ApiProperty({ description: 'Kinh độ', example: 106.660172 })
    longitude: number;

    @ApiProperty({ enum: EnterpriseStatus, description: 'Trạng thái', example: 'ACTIVE' })
    status: EnterpriseStatus;

    @ApiProperty({ description: 'Công suất xử lý (kg)', example: 1000.50 })
    capacityKg: number;

    @ApiProperty({ description: 'Số lượng collector', example: 5 })
    collectorCount: number;

    @ApiProperty({ description: 'Số điện thoại liên hệ', example: '0901234567' })
    contactPhone?: string;
}

