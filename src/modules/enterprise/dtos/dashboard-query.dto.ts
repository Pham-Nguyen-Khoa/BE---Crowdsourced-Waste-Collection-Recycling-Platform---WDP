import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class RankingQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({ enum: ['weight', 'tasks', 'trust'], default: 'weight' })
  @IsOptional()
  @IsEnum(['weight', 'tasks', 'trust'])
  sortBy?: string = 'weight';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class DashboardStatsQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'day' })
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  interval?: 'day' | 'week' | 'month' = 'day';
}
