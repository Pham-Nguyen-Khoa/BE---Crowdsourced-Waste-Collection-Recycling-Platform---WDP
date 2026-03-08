import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateComplaintDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  reportId: number;

  @ApiProperty({
    example: 'Người thu gom không đúng giờ và báo vắng sai sự thật.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
