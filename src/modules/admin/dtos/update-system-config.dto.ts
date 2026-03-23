import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSystemConfigDto {
  @ApiPropertyOptional({ example: 100, description: 'Điểm cơ bản citizen nhận được mỗi báo cáo' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  citizenBasePoint?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Hệ số nhân cho rác hữu cơ' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organicMultiplier?: number;

  @ApiPropertyOptional({ example: 1.2, description: 'Hệ số nhân cho rác tái chế' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recyclableMultiplier?: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Hệ số nhân cho rác nguy hiểm' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  hazardousMultiplier?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Hệ số độ chính xác MATCH' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accuracyMatchMultiplier?: number;

  @ApiPropertyOptional({ example: 0.7, description: 'Hệ số độ chính xác MODERATE' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accuracyModerateMultiplier?: number;

  @ApiPropertyOptional({ example: 0.3, description: 'Hệ số độ chính xác HEAVY' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accuracyHeavyMultiplier?: number;

  @ApiPropertyOptional({ example: 2, description: 'Trust score tăng khi collector hoàn thành đúng' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  collectorMatchTrustScore?: number;

  @ApiPropertyOptional({ example: 20, description: 'Phạt trust score: sai cân nặng' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  penaltyWeightMismatch?: number;

  @ApiPropertyOptional({ example: 30, description: 'Phạt trust score: thu phí trái phép' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  penaltyUnauthorizedFee?: number;

  @ApiPropertyOptional({ example: 15, description: 'Phạt trust score: không đến' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  penaltyNoShow?: number;

  @ApiPropertyOptional({ example: 10, description: 'Phạt trust score mặc định' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  penaltyDefault?: number;

  @ApiPropertyOptional({ example: 50, description: 'Điểm bồi thường citizen khi khiếu nại đúng' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  citizenCompensation?: number;
}
