import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { AdminComplaintService } from '../services/admin-complaint.service';
import { RespondComplaintDto } from '../dtos/respond-complaint.dto';
import { routesV1 } from 'src/configs/app.routes';

@ApiTags('Admin - Complaints')
@Controller(routesV1.apiversion + '/admin/complaints')
@UseGuards(JWTGuard, RolesGuard)
@Roles(4) // Admin role
@ApiBearerAuth()
export class AdminComplaintController {
  constructor(private readonly adminComplaintService: AdminComplaintService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất toán cả khiếu nại của Citizens' })
  async getAllComplaints(@Query() query: any) {
    return this.adminComplaintService.getAllComplaints(query);
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Phản hồi khiếu nại (Chấp nhận/Từ chối)' })
  async respondToComplaint(
    @Param('id') id: string,
    @Body() dto: RespondComplaintDto,
  ) {
    return this.adminComplaintService.respondToComplaint(+id, dto);
  }
}
