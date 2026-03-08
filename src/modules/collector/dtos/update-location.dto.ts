import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ description: 'Vĩ độ hiện tại', example: 10.762622 })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ hiện tại', example: 106.660172 })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}
