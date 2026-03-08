import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { RedeemGiftDto } from '../dtos/redeem-gift.dto';
import { PointTransactionType } from '@prisma/client';
import { NotificationService } from '../../notification/services/notification.service';
import {
  successResponse,
  errorResponse,
} from 'src/common/utils/response.util';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) { }

  async getAvailableGifts() {
    const gifts = await this.prisma.gift.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      orderBy: { requiredPoints: 'asc' },
    });
    return successResponse(200, gifts, 'Lấy danh sách quà tặng thành công');
  }

  async redeemGift(citizenId: number, dto: RedeemGiftDto) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Fetch User and Gift
      const user = await tx.user.findUnique({ where: { id: citizenId } });
      const gift = await tx.gift.findUnique({ where: { id: dto.giftId } });

      if (!user) {
        errorResponse(400, 'Không tìm thấy tài khoản công dân');
      }

      if (!gift || !gift.isActive) {
        errorResponse(400, 'Quà tặng không tồn tại hoặc đã bị khoá');
      }

      if (gift.stock <= 0) {
        errorResponse(400, 'Quà tặng này đã hết suất');
      }

      // 2. Check points
      if (user.balance < gift.requiredPoints) {
        errorResponse(400,
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

      // 4. Create Point Transaction (Universal history)
      const transaction = await tx.pointTransaction.create({
        data: {
          userId: citizenId,
          giftId: dto.giftId,
          type: PointTransactionType.SPEND,
          amount: gift.requiredPoints,
          balanceAfter: updatedUser.balance,
          description: `Đổi quà: ${gift.name}`,
        },
        include: { gift: true },
      });

      // 5. Notify user (Non-blocking)
      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: citizenId,
            title: '🎁 Đổi quà thành công!',
            content: `Chúc mừng! Bạn đã đổi thành công "${gift.name}". Vui lòng kiểm tra lịch sử đổi quà để biết thêm chi tiết.`,
            type: 'SYSTEM',
            meta: {
              giftId: gift.id,
              transactionId: transaction.id,
              type: 'GIFT_REDEEMED',
            },
          });
        } catch (err) {
          this.logger.error(
            `Failed to notify user on gift redemption for user ${citizenId}`,
            err?.message,
          );
        }
      });

      return successResponse(200, transaction, 'Đổi quà thành công');
    });
  }

  async getMyRedemptions(citizenId: number) {
    const transactions = await this.prisma.pointTransaction.findMany({
      where: {
        userId: citizenId,
        giftId: { not: null }
      },
      include: { gift: true },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(200, transactions, 'Lấy lịch sử đổi quà thành công');
  }

  async getMyPoints(citizenId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: citizenId },
      select: { balance: true },
    });

    if (!user) {
      return errorResponse(400, 'Không tìm thấy tài khoản công dân');
    }

    return successResponse(
      200,
      { points: user.balance },
      'Lấy số điểm hiện tại thành công',
    );
  }
}
