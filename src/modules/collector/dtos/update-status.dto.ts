import {
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectorAvailability } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({
    enum: CollectorAvailability,
    example: CollectorAvailability.ONLINE_AVAILABLE,
    description: 'ONLINE_AVAILABLE, ONLINE_BUSY, or OFFLINE',
  })
  @IsEnum(CollectorAvailability)
  availability: CollectorAvailability;

  @ApiPropertyOptional({
    example: 10.762622,
    description: 'Required when turning ONLINE',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    example: 106.660172,
    description: 'Required when turning ONLINE',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 'device-id-123' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
