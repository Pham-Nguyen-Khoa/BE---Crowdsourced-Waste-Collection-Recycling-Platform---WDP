import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { ComplaintType } from '@prisma/client';

export class CreateComplaintDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  reportId: number;

  @ApiProperty({
    enum: ComplaintType,
    example: 'ATTITUDE',
    description: 'Loại khiếu nại',
  })
  @IsEnum(ComplaintType)
  @IsNotEmpty()
  type: ComplaintType;

  @ApiProperty({
    example: 'Người thu gom không đúng giờ và báo vắng sai sự thật.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' }, required: false })
  @IsOptional()
  files?: any[];
}
