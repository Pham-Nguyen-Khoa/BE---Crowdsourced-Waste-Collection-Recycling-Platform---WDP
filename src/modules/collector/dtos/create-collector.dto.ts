import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotEqualTo } from '../../../common/decorators/not-equal-to.decorator';

export class CreateCollectorDto {
  @ApiProperty({
    example: 'collector1@wdp.com',
    description: 'Email của collector',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Nguyễn Văn Thu Gom',
    description: 'Họ tên collector',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({
    example: '0987654321',
    description: 'Số điện thoại',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    example: {
      Monday: { start: '08:00', end: '17:00', active: true },
      Tuesday: { start: '08:00', end: '17:00', active: true },
      Wednesday: { start: '08:00', end: '17:00', active: true },
      Thursday: { start: '08:00', end: '17:00', active: true },
      Friday: { start: '08:00', end: '17:00', active: true },
      Saturday: { start: '08:00', end: '12:00', active: true },
      Sunday: { start: '00:00', end: '00:00', active: false },
    },
    description: 'Cấu hình giờ làm việc theo từng thứ trong tuần',
  })
  @IsNotEmpty()
  workingHours: any;
}
