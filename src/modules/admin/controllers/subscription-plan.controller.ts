import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { routesV1 } from 'src/configs/app.routes';
import { SubscriptionPlanService } from '../services/subscription-plan.service';
import { CreateSubscriptionPlanDto } from '../dtos/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from '../dtos/update-subscription-plan.dto';

@ApiTags('Admin - Subscription Plans')
@Controller(routesV1.apiversion + '/admin/subscription-plans')
@UseGuards(JWTGuard, RolesGuard)
@Roles(4) // ADMIN
@ApiBearerAuth()
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo gói subscription mới' })
  create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlanService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả gói subscription' })
  findAll() {
    return this.subscriptionPlanService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết gói subscription' })
  findOne(@Param('id') id: string) {
    return this.subscriptionPlanService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật gói subscription' })
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.subscriptionPlanService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hoặc ngưng hoạt động gói subscription' })
  remove(@Param('id') id: string) {
    return this.subscriptionPlanService.remove(+id);
  }
}
