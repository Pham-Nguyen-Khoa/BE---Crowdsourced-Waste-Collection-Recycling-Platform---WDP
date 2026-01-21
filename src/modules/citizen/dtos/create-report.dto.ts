import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayNotEmpty,
  ValidateNested,
  IsEnum,
  Min,
  Max
} from "class-validator"
import { Type, Transform } from "class-transformer"
import { WasteType } from "@prisma/client"
import { BadRequestException } from "@nestjs/common"

export class WasteItemDto {
  @ApiProperty({
    example: 'ORGANIC',
    description: 'Loại rác',
    enum: WasteType
  })
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(WasteType)
  wasteType: WasteType

  @ApiProperty({
    example: 5.5,
    description: 'Trọng lượng tính bằng kg'
  })
  @Transform(({ value }) => {
    const num = typeof value === 'string' ? Number(value) : value;
    return isNaN(num) ? value : num;
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  weightKg: number
}



// DTO for multipart/form-data requests
export class CreateReportMultipartDto {
  @ApiProperty({
    example: '123 Đường ABC, Quận 1, TP.HCM',
    description: 'Địa chỉ thu gom rác'
  })
  @IsString()
  @IsNotEmpty()
  address: string

  @ApiProperty({
    example: 10.8231,
    description: 'Vĩ độ (latitude)',
    minimum: -90,
    maximum: 90
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number

  @ApiProperty({
    example: 106.6297,
    description: 'Kinh độ (longitude)',
    minimum: -180,
    maximum: 180
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number

  @ApiProperty({
    example: '79',
    description: 'Mã tỉnh/thành phố'
  })
  @IsString()
  @IsNotEmpty()
  provinceCode: string

  @ApiProperty({
    example: '769',
    description: 'Mã quận/huyện'
  })
  @IsString()
  @IsNotEmpty()
  districtCode: string

  @ApiPropertyOptional({
    example: '26734',
    description: 'Mã phường/xã'
  })
  @IsOptional()
  @IsString()
  wardCode: string

  @ApiPropertyOptional({
    example: 'Có khoảng 5kg rác hữu cơ từ rau củ quả',
    description: 'Mô tả chi tiết về rác (tùy chọn)'
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({
    type: [WasteItemDto],
    description: 'Danh sách các loại rác (JSON string)',
    example: JSON.stringify([
      { wasteType: 'ORGANIC', weightKg: 5.5 },
      { wasteType: 'RECYCLABLE', weightKg: 2 }
    ])
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);

        if (!Array.isArray(parsed)) {
          throw new Error();
        }
        console.log(parsed)

        return parsed;
      } catch {
        console.log("hello")
        throw new BadRequestException(
          'wasteItems phải là JSON array hợp lệ'
        );
      }
    }
    return value;
  })
  @IsArray()
  // @ArrayNotEmpty()
  // @ValidateNested({ each: true })
  // @Type(() => WasteItemDto)
  wasteItems: WasteItemDto[];

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    required: false,
  })
  @IsOptional()
  files?: any[];
}
