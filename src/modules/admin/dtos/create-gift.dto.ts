import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

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
  @IsNumber()
  @IsNotEmpty()
  requiredPoints: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsNotEmpty()
  stock: number;

  @ApiProperty({ example: 'https://example.com/voucher-image.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
