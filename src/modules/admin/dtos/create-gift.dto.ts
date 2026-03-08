import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGiftDto {
  @ApiProperty({ example: 'Voucher VinMart 50k' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Dùng để mua hàng tại VinMart trên toàn quốc.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  requiredPoints: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  stock: number;

  @ApiProperty({ example: 'https://example.com/voucher-image.png', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  image?: any;
}
