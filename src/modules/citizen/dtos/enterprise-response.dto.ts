import { IsNumber, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnterpriseResponseDto {
  @ApiProperty({ description: 'Report ID' })
  @IsNumber()
  reportId: number;

  @ApiProperty({ description: 'Enterprise ID' })
  @IsNumber()
  enterpriseId: number;

  @ApiProperty({ description: 'Accept or reject the report' })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ description: 'Optional notes/reason', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EnterpriseResponseResponseDto {
  success: boolean;
  message: string;
  reportId: number;
  status: string;
}
