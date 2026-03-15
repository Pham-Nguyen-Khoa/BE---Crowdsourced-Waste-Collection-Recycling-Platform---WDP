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
      // 1. Fetch User and Gift
      const user = await tx.user.findUnique({ where: { id: citizenId } });
      const gift = await tx.gift.findUnique({ where: { id: dto.giftId } });

      if (!gift || !gift.isActive) {
        throw new BadRequestException('Quà tặng không tồn tại hoặc đã bị khoá');
      }

      const userPoints = user?.balance ?? 0;
      if (userPoints < gift.requiredPoints) {
        throw new BadRequestException(
          `Bạn không đủ điểm. Cần ${gift.requiredPoints} nhưng bạn chỉ có ${userPoints}`,
        );
      }

      if (gift.stock <= 0) {
        throw new BadRequestException('Quà tặng này đã hết suất');
      }

      // 3. Deduct points & update stock
      const updatedUser = await tx.user.update({
        where: { id: citizenId },
        data: { balance: { decrement: gift.requiredPoints } },
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

  async getMyRedemptions(citizenId: number, type?: PointTransactionType) {
    const where: any = { userId: citizenId };
    if (type) {
      where.type = type;
    }

    const transactions = await this.prisma.pointTransaction.findMany({
      where,
      include: {
        gift: true,
        report: {
          include: {
            actualWasteItems: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // 1. Lấy config hệ thống để tính breakdown
    const config = await this.prisma.systemConfig.findUnique({ where: { id: 1 } });
    const baseReward = config?.citizenBasePoint || 100;

    const accuracyMultipliers: any = {
      HEAVY: config?.accuracyHeavyMultiplier || 0.3,
      MODERATE: config?.accuracyModerateMultiplier || 0.7,
      MATCH: config?.accuracyMatchMultiplier || 1.0,
    };

    const wasteTypeMultipliers: any = {
      ORGANIC: config?.organicMultiplier || 1.0,
      RECYCLABLE: config?.recyclableMultiplier || 1.2,
      HAZARDOUS: config?.hazardousMultiplier || 1.5,
    };

    // 2. Map dữ liệu để thêm breakdown
    const enrichedTransactions = transactions.map(tx => {
      let breakdown: any = null;

      if (tx.type === PointTransactionType.EARN && tx.report) {
        const accuracyMultiplier = accuracyMultipliers[tx.report.accuracyBucket || 'MATCH'] || 1.0;
        
        const calculation = tx.report.actualWasteItems.map(item => {
          const wasteMultiplier = wasteTypeMultipliers[item.wasteType] || 1.0;
          const roundedPoints = Math.round(
            baseReward * Number(item.weightKg) * accuracyMultiplier * wasteMultiplier
          );

          return {
            wasteType: item.wasteType,
            weightKg: item.weightKg,
            basePoints: baseReward,
            accuracyMultiplier,
            wasteMultiplier,
            pointsEarned: roundedPoints
          };
        });

        breakdown = {
          source: 'REPORT',
          reportId: tx.reportId,
          accuracyBucket: tx.report.accuracyBucket,
          accuracyMultiplier,
          items: calculation
        };
      } else if (tx.type === PointTransactionType.SPEND && tx.gift) {
        breakdown = {
          source: 'GIFT_REDEEM',
          gift: {
            id: tx.gift.id,
            name: tx.gift.name,
            type: tx.gift.type,
            imageUrl: tx.gift.imageUrl,
            requiredPoints: tx.gift.requiredPoints
          }
        };
      }

      return {
        ...tx,
        breakdown
      };
    });

    return successResponse(200, enrichedTransactions, 'Lấy lịch sử giao dịch điểm thành công');
  }

  async getMyPoints(citizenId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: citizenId },
      select: { balance: true },
    });

    return successResponse(
      200,
      { points: user?.balance || 0 },
      'Lấy số điểm hiện tại thành công',
    );
  }

  async getMyGifts(citizenId: number) {
    const gifts = await this.prisma.pointTransaction.findMany({
      where: {
        userId: citizenId,
        type: PointTransactionType.SPEND,
        giftId: { not: null }
      },
      include: { gift: true },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(200, gifts, 'Lấy danh sách quà đã đổi thành công');
  }
}
