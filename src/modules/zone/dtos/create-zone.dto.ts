import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateZoneDto {
  @ApiProperty({ example: 'ZONE_01', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim().toUpperCase())
  code: string;

  @ApiProperty({ example: 'Quận 1 - Vùng A', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: '79' }) // HCM
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  provinceCode: string;

  @ApiPropertyOptional({ example: '760' }) // Quận 1
  @IsOptional()
  @IsString()
  @Length(1, 10)
  districtCode?: string;

  @ApiPropertyOptional({ example: '26734' }) // Bến Nghé
  @IsOptional()
  @IsString()
  @Length(1, 10)
  wardCode?: string;
  @ApiPropertyOptional({
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [106.66, 10.76],
          [106.67, 10.76],
          [106.67, 10.77],
          [106.66, 10.77],
          [106.66, 10.76],
        ],
      ],
    },
  })
  @IsOptional()
  boundary?: any;
}
