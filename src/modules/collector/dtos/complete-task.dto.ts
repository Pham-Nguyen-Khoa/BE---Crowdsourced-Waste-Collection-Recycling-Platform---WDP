import { IsNumber, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccuracyBucket } from '@prisma/client';
import { Type } from 'class-transformer';

export class CompleteTaskDto {
  @ApiProperty({ example: 1, description: 'ID của report cần hoàn tất' })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  reportId: number;

  @ApiProperty({
    example: 5.5,
    required: false,
    nullable: true,
    description: 'Cân nặng thực tế (kg) cho rác HỮU CƠ (ORGANIC). Bắt buộc nếu report có loại ORGANIC.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightOrganic?: number | null;

  @ApiProperty({
    example: 2.0,
    required: false,
    nullable: true,
    description: 'Cân nặng thực tế (kg) cho rác TÁI CHẾ (RECYCLABLE). Bắt buộc nếu report có loại RECYCLABLE.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightRecyclable?: number | null;

  @ApiProperty({
    example: 1.0,
    required: false,
    nullable: true,
    description: 'Cân nặng thực tế (kg) cho rác NGUY HẠI (HAZARDOUS). Bắt buộc nếu report có loại HAZARDOUS.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightHazardous?: number | null;

  @ApiProperty({
    enum: AccuracyBucket,
    example: AccuracyBucket.MATCH,
    description: 'Mức độ chính xác tổng thể: MATCH | MODERATE | HEAVY',
  })
  @IsEnum(AccuracyBucket)
  @IsNotEmpty()
  accuracyBucket: AccuracyBucket;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
    description: 'Hình ảnh bằng chứng thu gom (upload từ máy)',
  })
  @IsOptional()
  files?: Express.Multer.File[];
}
