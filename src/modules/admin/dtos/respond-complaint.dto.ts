import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ComplaintStatus } from '@prisma/client';

export class RespondComplaintDto {
  @ApiProperty({ enum: ComplaintStatus, example: 'PROCESSED' })
  @IsEnum(ComplaintStatus)
  @IsNotEmpty()
  status: ComplaintStatus;

  @ApiProperty({ example: 'Chúng tôi đã tiếp nhận và xử lý người thu gom này. Cảm ơn bác đã phản hồi.' })
  @IsString()
  @IsNotEmpty()
  response: string;
}
