import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComplaintService } from '../services/complaint.service';
import { CreateComplaintDto } from '../dtos/create-complaint.dto';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../auth/guards/get-user.decorator';
import { User } from '@prisma/client';
import { routesV1 } from '../../../configs/app.routes';

@ApiTags('Citizen Complaints')
@Controller(routesV1.apiversion)
@UseGuards(JWTGuard)
@ApiBearerAuth()
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post(routesV1.citizen.createComplaint || '/citizen/complaints')
  @ApiOperation({ summary: 'Gửi khiếu nại về báo cáo/người thu gom' })
  async createComplaint(
    @GetUser() user: User,
    @Body() dto: CreateComplaintDto,
  ) {
    return await this.complaintService.createComplaint(user.id, dto);
  }

  @Get(routesV1.citizen.getMyComplaints || '/citizen/complaints')
  @ApiOperation({ summary: 'Xem danh sách khiếu nại của tôi' })
  async getMyComplaints(@GetUser() user: User) {
    return await this.complaintService.getMyComplaints(user.id);
  }
}
