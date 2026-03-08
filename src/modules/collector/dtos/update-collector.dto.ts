import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCollectorDto {
  @ApiProperty({
    example: 'Nguyễn Văn Collector Mới',
    description: 'Họ và tên collector',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Ảnh đại diện collector',
    required: false,
  })
  @IsOptional()
  avatar?: any;
}
