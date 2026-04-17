import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { routesV1 } from 'src/configs/app.routes';
import { AdminPaymentService } from '../services/admin-payment.service';

@ApiTags('Admin - Payments')
@Controller(routesV1.apiversion + '/admin/payments')
@UseGuards(JWTGuard, RolesGuard)
@Roles(4)
@ApiBearerAuth()
export class AdminPaymentController {
  constructor(private readonly adminPaymentService: AdminPaymentService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thanh toán (filter & search)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'] })
  @ApiQuery({ name: 'method', required: false, enum: ['BANK_TRANSFER'] })
  @ApiQuery({ name: 'planId', required: false, type: Number })
  @ApiQuery({ name: 'enterpriseId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'createdFrom', required: false, type: String })
  @ApiQuery({ name: 'createdTo', required: false, type: String })
  @ApiQuery({ name: 'paidFrom', required: false, type: String })
  @ApiQuery({ name: 'paidTo', required: false, type: String })
  async getPayments(@Query() query: any) {
    return this.adminPaymentService.getPayments(query);
  }

  @Get('reference/:referenceCode')
  @ApiOperation({ summary: 'Chi tiết thanh toán theo mã reference' })
  async getPaymentByReference(@Param('referenceCode') referenceCode: string) {
    return this.adminPaymentService.getPaymentByReference(referenceCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết thanh toán theo ID' })
  async getPaymentById(@Param('id') id: string) {
    return this.adminPaymentService.getPaymentById(+id);
  }
}
