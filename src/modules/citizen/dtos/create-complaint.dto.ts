import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateComplaintDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  reportId: number;

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
