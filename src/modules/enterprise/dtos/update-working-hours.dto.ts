import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateWorkingHoursDto {
  @ApiProperty({
    example: {
      "monday": { "start": "08:00", "end": "17:00", "active": true },
      "tuesday": { "start": "08:00", "end": "17:00", "active": true },
      "wednesday": { "start": "08:00", "end": "17:00", "active": true },
      "thursday": { "start": "08:00", "end": "17:00", "active": true },
      "friday": { "start": "08:00", "end": "17:00", "active": true },
      "saturday": { "active": false },
      "sunday": { "active": false }
    },
    description: 'Lịch làm việc hàng tuần dạng JSON'
  })
  @IsNotEmpty()
  @IsObject()
  workingHours: any;
}
