import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateGiftDto {
  @ApiProperty({ example: 'Voucher VinMart 100k', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Dùng để mua hàng tại VinMart trên toàn quốc.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1000, required: false })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  requiredPoints?: number;

  @ApiProperty({ example: 50, required: false })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({
    example: 'https://example.com/new-image.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'true = hiển thị, false = ẩn khỏi danh sách',
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  image?: any;
}
