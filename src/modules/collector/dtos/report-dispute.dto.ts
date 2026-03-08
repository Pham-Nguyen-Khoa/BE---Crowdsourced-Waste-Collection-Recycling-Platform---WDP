import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ReportDisputeDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
    description: 'Upload evidence images',
  })
  @IsOptional()
  files?: Express.Multer.File[];

  @ApiProperty({
    description: 'Lý do báo cáo sự cố (VD: Không có rác, rác sai loại nặng)',
    example: 'Đã đến tận nơi nhưng Citizen không có rác tái chế',
  })
  @IsString()
  @MinLength(5)
  reason: string;
}
