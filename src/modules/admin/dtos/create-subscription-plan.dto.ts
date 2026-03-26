import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Gói Cơ Bản' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Dành cho doanh nghiệp nhỏ', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 100000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationMonths: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
