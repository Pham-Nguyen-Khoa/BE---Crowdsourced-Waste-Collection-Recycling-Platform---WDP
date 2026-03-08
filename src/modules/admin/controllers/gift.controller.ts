import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GiftAdminService } from '../services/gift-admin.service';
import { CreateGiftDto } from '../dtos/create-gift.dto';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { routesV1 } from '../../../configs/app.routes';

@ApiTags('Admin Gift Management')
@Controller(routesV1.apiversion + '/admin/gifts')
@UseGuards(JWTGuard, RolesGuard)
@Roles(4) // Admin Role ID
@ApiBearerAuth()
export class GiftController {
  constructor(private readonly giftService: GiftAdminService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo quà tặng mới' })
  async createGift(@Body() dto: CreateGiftDto) {
    return await this.giftService.createGift(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Xem tất cả quà tặng' })
  async getAllGifts() {
    return await this.giftService.getAllGifts();
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Cập nhật kho hàng' })
  async updateStock(@Param('id') id: string, @Body('stock') stock: number) {
    return await this.giftService.updateGiftStock(+id, stock);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Khoá quà tặng' })
  async deleteGift(@Param('id') id: string) {
    return await this.giftService.deleteGift(+id);
  }

  @Get('redemptions')
  @ApiOperation({ summary: 'Xem tất cả các yêu cầu đổi quà' })
  async getAllRedemptions() {
    return await this.giftService.getAllRedemptions();
  }
}
