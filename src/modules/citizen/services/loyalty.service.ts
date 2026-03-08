import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { RedeemGiftDto } from '../dtos/redeem-gift.dto';
import { PointTransactionType } from '@prisma/client';
import { NotificationService } from '../../notification/services/notification.service';
import { successResponse } from 'src/common/utils/response.util';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async getAvailableGifts() {
    const gifts = await (this.prisma as any).gift.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      orderBy: { requiredPoints: 'asc' },
    });
    return successResponse(200,gifts,  'Lấy danh sách quà tặng thành công');
  }

  async redeemGift(citizenId: number, dto: RedeemGiftDto) {
    return await this.prisma.$transaction(async (tx_raw) => {
      const tx = tx_raw as any;
      // 1. Fetch User and Gift
      const user = await tx.user.findUnique({ where: { id: citizenId } });
      const gift = await tx.gift.findUnique({ where: { id: dto.giftId } });

      if (!user) {
        throw new NotFoundException('Không tìm thấy tài khoản công dân');
      }

      if (!gift || !gift.isActive) {
        throw new NotFoundException('Quà tặng không tồn tại hoặc đã bị khoá');
      }

      if (gift.stock <= 0) {
        throw new BadRequestException('Quà tặng này đã hết suất');
      }

      // 2. Check points
      if (user.balance < gift.requiredPoints) {
        throw new BadRequestException(
          `Bạn không đủ điểm. Cần ${gift.requiredPoints} nhưng bạn chỉ có ${user.balance}`,
        );
      }

      // 3. Deduct points & update stock
      const updatedUser = await tx.user.update({
        where: { id: citizenId },
        data: { balance: { decrement: gift.requiredPoints } },
        select: { balance: true },
      });

      await tx.gift.update({
        where: { id: dto.giftId },
        data: { stock: { decrement: 1 } },
      });

      // 4. Create Redemption Record
      const redemption = await tx.redemption.create({
        data: {
          userId: citizenId,
          giftId: dto.giftId,
          pointsUsed: gift.requiredPoints,
          status: 'PENDING',
        },
        include: { gift: true },
      });

      // 5. Audit logs
      await tx.pointTransaction.create({
        data: {
          userId: citizenId,
          type: PointTransactionType.SPEND,
          amount: gift.requiredPoints,
          balanceAfter: updatedUser.balance,
        },
      });

      await tx.citizenPointHistory.create({
        data: {
          citizenId,
          point: -gift.requiredPoints,
          reason: `Đổi quà: ${gift.name}`,
        },
      });

      // 6. Notify user (Non-blocking)
      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: citizenId,
            title: '🎁 Đổi quà thành công!',
            content: `Chúc mừng! Bạn đã đổi thành công "${gift.name}". Vui lòng kiểm tra lịch sử đổi quà để biết thêm chi tiết.`,
            type: 'SYSTEM',
            meta: {
              giftId: gift.id,
              redemptionId: redemption.id,
              type: 'GIFT_REDEEMED',
            },
          });
        } catch (err) {
          this.logger.error(
            `Failed to notify user on gift redemption ${redemption.id}`,
            err?.message,
          );
        }
      });

      return successResponse(200, redemption, 'Đổi quà thành công');
    });
  }

  async getMyRedemptions(citizenId: number) {
    const redemptions = await (this.prisma as any).redemption.findMany({
      where: { userId: citizenId },
      include: { gift: true },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(200, redemptions, 'Lấy lịch sử đổi quà thành công'); 
  }
}
