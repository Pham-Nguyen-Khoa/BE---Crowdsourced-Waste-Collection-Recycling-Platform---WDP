import { Controller, Patch, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../auth/guards/get-user.decorator';
import { CitizenPresenceService } from '../services/citizen-presence.service';

@ApiTags('Citizen – Report Interactions')
@Controller('citizen/reports')
@ApiBearerAuth()
@UseGuards(JWTGuard)
export class CitizenPresenceController {
  constructor(private readonly presenceService: CitizenPresenceService) {}

  @ApiOperation({
    summary: 'Citizen xác nhận đang có mặt tại điểm thu gom',
    description:
      'Gọi khi nhận được thông báo Collector đã ARRIVED. ' +
      'Sau khi xác nhận, Collector sẽ không thể báo vắng. ' +
      'Chỉ có thể gọi khi report.status = ARRIVED.',
  })
  @ApiParam({ name: 'reportId', type: Number, description: 'ID của báo cáo' })
  @Patch(':reportId/confirm-presence')
  async confirmPresence(
    @GetUser() user: any,
    @Param('reportId') reportId: string,
  ) {
    return this.presenceService.confirmPresence(user.id, +reportId);
  }

  @ApiOperation({
    summary: 'Citizen tự báo vắng mặt',
    description:
      'Gọi khi Citizen biết trước mình không thể tiếp đón Collector. ' +
      'Collector sẽ được notify. ' +
      'Chỉ có thể gọi khi report.status = ARRIVED và chưa confirm presence.',
  })
  @ApiParam({ name: 'reportId', type: Number, description: 'ID của báo cáo' })
  @Patch(':reportId/report-absent')
  async reportAbsent(
    @GetUser() user: any,
    @Param('reportId') reportId: string,
  ) {
    return this.presenceService.reportAbsent(user.id, +reportId);
  }
}
