import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

export class CreateCollectorDto {
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

}
