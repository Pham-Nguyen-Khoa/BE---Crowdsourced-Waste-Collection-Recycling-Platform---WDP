import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
      // 1. Fetch UserPoint and Gift
      const userPoint = await tx.userPoint.findUnique({ where: { userId: citizenId } });
      const gift = await tx.gift.findUnique({ where: { id: dto.giftId } });

      if (!gift || !gift.isActive) {
        throw new BadRequestException('Quà tặng không tồn tại hoặc đã bị khoá');
      }

      const userPoints = userPoint?.points ?? 0;
      if (userPoints < gift.requiredPoints) {
        throw new BadRequestException(
          `Bạn không đủ điểm. Cần ${gift.requiredPoints} nhưng bạn chỉ có ${userPoints}`,
        );
      }

      if (gift.stock <= 0) {
        throw new BadRequestException('Quà tặng này đã hết suất');
      }

      // 3. Deduct points & update stock
      const updatedUserPoint = await tx.userPoint.update({
        where: { userId: citizenId },
        data: { points: { decrement: gift.requiredPoints } },
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
          balanceAfter: updatedUserPoint.points,
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

  async getMyRedemptions(citizenId: number, type?: PointTransactionType) {
    const where: any = { userId: citizenId };
    if (type) {
      where.type = type;
    }

    const transactions = await this.prisma.pointTransaction.findMany({
      where,
      include: { gift: true },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(200, transactions, 'Lấy lịch sử giao dịch điểm thành công');
  }

  async getMyPoints(citizenId: number) {
    const userPoint = await this.prisma.userPoint.findUnique({
      where: { userId: citizenId },
      select: { points: true },
    });

    return successResponse(
      200,
      { points: userPoint?.points || 0 },
      'Lấy số điểm hiện tại thành công',
    );
  }
}
