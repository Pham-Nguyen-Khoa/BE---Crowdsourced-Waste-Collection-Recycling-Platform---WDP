import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from '../services/loyalty.service';
import { RedeemGiftDto } from '../dtos/redeem-gift.dto';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../auth/guards/get-user.decorator';
import { User } from '@prisma/client';
import { routesV1 } from '../../../configs/app.routes';

@ApiTags('Citizen Loyalty')
@Controller(routesV1.apiversion)
@UseGuards(JWTGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get(routesV1.citizen.getGifts)
  @ApiOperation({ summary: 'Xem danh sách quà tặng khả dụng' })
  async getGifts() {
    return await this.loyaltyService.getAvailableGifts();
  }

  @Post(routesV1.citizen.redeemGift)
  @ApiOperation({ summary: 'Đổi điểm lấy quà' })
  async redeemGift(@GetUser() user: User, @Body() dto: RedeemGiftDto) {
    return await this.loyaltyService.redeemGift(user.id, dto);
  }

  @Get(routesV1.citizen.getMyRedemptions)
  @ApiOperation({ summary: 'Xem lịch sử đổi quà của tôi' })
  async getMyRedemptions(@GetUser() user: User) {
    return await this.loyaltyService.getMyRedemptions(user.id);
  }
}
