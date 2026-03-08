import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class RedeemGiftDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  giftId: number;
}
