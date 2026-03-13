import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { AccuracyBucket, PointTransactionType, Prisma } from '@prisma/client';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) { }

  /**
   * GIAI ĐOẠN 4: Settlement tài chính
   * Được kích hoạt sau khi Transaction A (vật lý) commit thành công
   * Payload type phải khớp với emit trong completeTask()
   */
  @OnEvent('report.collected')
  async handleReportCollected(payload: {
    reportId: number;
    citizenId: number;
    collectorId: number;
    perTypeWeights: { wasteType: string; weight: number }[];
    totalActualWeight: number;
    accuracyBucket: AccuracyBucket;
    arrivedAt: Date | null;
    collectedAt: Date;
  }) {
    this.logger.log(`Processing reward for report ${payload.reportId}`);

    try {
      await this.prisma.$transaction(async (tx_raw) => {
        const tx = tx_raw as any;
        // 1. Idempotent check (Tránh double reward)
        const existingTx = await tx.pointTransaction.findFirst({
          where: {
            reportId: payload.reportId,
            type: PointTransactionType.EARN,
          },
        });

        if (existingTx) {
          this.logger.warn(
            `Report ${payload.reportId} already rewarded. Skipping.`,
          );
          return;
        }

        // ──────────────────────────────────────────────
        // 2. Tính CITIZEN reward (theo từng loại rác)
        // ──────────────────────────────────────────────
        const accuracyMultipliers: Record<AccuracyBucket, number> = {
          [AccuracyBucket.HEAVY]: 0.3,
          [AccuracyBucket.MODERATE]: 0.7,
          [AccuracyBucket.MATCH]: 1.0,
        };
        const accuracyMultiplier =
          accuracyMultipliers[payload.accuracyBucket] ?? 1.0;

        const wasteTypeMultipliers: Record<string, number> = {
          ORGANIC: 1.0,
          RECYCLABLE: 1.2,
          HAZARDOUS: 1.5,
        };

        // Tính reward từng loại rác rồi cộng lại
        let finalReward = 0;
        const rewardBreakdown: string[] = [];
        const baseReward = 100; // Default when PointConfig is removed

        const vietnameseWasteTypes: Record<string, string> = {
          ORGANIC: 'RÁC HỮU CƠ',
          RECYCLABLE: 'RÁC TÁI CHẾ',
          HAZARDOUS: 'RÁC NGUY HẠI',
        };

        const vietnameseAccuracy: Record<string, string> = {
          HEAVY: 'Sai lệch nhiều',
          MODERATE: 'Sai lệch vừa phải',
          MATCH: 'Chính xác',
        };

        for (const item of payload.perTypeWeights) {
          const wasteTypeMultiplier = wasteTypeMultipliers[item.wasteType] ?? 1.0;
          const itemReward = Math.round(
            baseReward * item.weight * accuracyMultiplier * wasteTypeMultiplier,
          );
          finalReward += itemReward;
          const label = vietnameseWasteTypes[item.wasteType] || item.wasteType;
          rewardBreakdown.push(`${label}: ${item.weight}kg = ${itemReward}pts`);
        }

        // 3. Update Citizen balance
        const updatedCitizenUser = await tx.user.update({
          where: { id: payload.citizenId },
          data: { balance: { increment: finalReward } },
          select: { balance: true },
        });

        // 4. Insert PointTransaction (audit log with description)
        const accuracyLabel = vietnameseAccuracy[payload.accuracyBucket] || payload.accuracyBucket;
        await tx.pointTransaction.create({
          data: {
            reportId: payload.reportId,
            userId: payload.citizenId,
            type: PointTransactionType.EARN,
            amount: finalReward,
            balanceAfter: updatedCitizenUser.balance,
            description: `Thu gom ${payload.totalActualWeight}kg (${rewardBreakdown.join('; ')}) – độ chính xác: ${accuracyLabel}`,
          },
        });

        // ──────────────────────────────────────────────
        // 6. Tính COLLECTOR earnings + trustScore
        // ──────────────────────────────────────────────
        let collectorEarnings = 0;
        for (const item of payload.perTypeWeights) {
          const wasteTypeMultiplier = wasteTypeMultipliers[item.wasteType] ?? 1.0;
          collectorEarnings += Math.round(item.weight * 1000 * wasteTypeMultiplier);
        }
        const SUCCESS_TRUST_SCORE = 2; // Điểm thưởng mặc định khi hoàn thành

        await tx.collector.update({
          where: { id: payload.collectorId },
          data: {
            earnings: { increment: collectorEarnings },
            trustScore: { increment: SUCCESS_TRUST_SCORE },
          },
        });

        // Reset consecutiveSkipCount khi hoàn thành task (họ đang thực sự làm việc)
        await tx.collectorStatus.update({
          where: { collectorId: payload.collectorId },
          data: { available: "ONLINE_AVAILABLE" } as any,
        });

        // ──────────────────────────────────────────────
        // 7. Update Report → COMPLETED
        // ──────────────────────────────────────────────
        const now = new Date();
        const updatedReport = await tx.report.updateMany({
          where: { id: payload.reportId, status: 'COLLECTED' },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            updatedAt: now,
          },
        });

        // Cập nhật completedAt cho assignment
        await tx.reportAssignment.update({
          where: { reportId: payload.reportId },
          data: { completedAt: now },
        });

        if (updatedReport.count === 0) {
          this.logger.warn(
            `Report ${payload.reportId} status was not COLLECTED. Settlement ignored.`,
          );
          return;
        }

        this.logger.log(
          `Successfully completed reward settlement for report ${payload.reportId}. ` +
          `Citizen reward: ${finalReward} pts. Collector earnings: ${collectorEarnings}đ. ` +
          `Collector trustScore: +${SUCCESS_TRUST_SCORE}`,
        );

        // 8. [NON-BLOCKING] Notify Citizen về điểm thưởng (sau khi tx commit)
        setImmediate(async () => {
          try {
            await this.notificationService.createAndNotify({
              userId: payload.citizenId,
              title: '🎉 Thu gom hoàn tất! Bạn nhận được điểm thưởng',
              content: `Báo cáo #${payload.reportId} đã hoàn tất. Bạn được cộng ${finalReward} điểm vào tài khoản.`,
              type: 'REPORT_STATUS_CHANGED',
              meta: {
                reportId: payload.reportId,
                pointsEarned: finalReward,
                type: 'REPORT_COMPLETED',
              },
            });
          } catch (err) {
            this.logger.error(
              `Failed to send COMPLETED notification to citizen ${payload.citizenId}`,
              err?.message,
            );
          }
        });
      });
    } catch (error) {
      // Xử lý unique constraint (P2002) – Graceful return (idempotent)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Duplicate reward attempt detected for report ${payload.reportId}. Ignored gracefully.`,
        );
        return;
      }

      this.logger.error(
        `Failed to settle reward for report ${payload.reportId}`,
        error.stack,
      );
    }
  }
}
