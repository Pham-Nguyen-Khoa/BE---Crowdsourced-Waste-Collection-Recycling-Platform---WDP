import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { DispatchService } from '../services/dispatch.service';
import { CollectorActivityService } from '../services/collector-activity.service';
import { CollectorQueueService } from '../services/collector-queue.service';

@Injectable()
export class AttemptTimeoutScheduler {
  private readonly logger = new Logger(AttemptTimeoutScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchService: DispatchService,
    private readonly activityService: CollectorActivityService,
    private readonly queueService: CollectorQueueService,
  ) { }

  @Cron('*/2 * * * *')
  async handleTimeoutAttempts() {
    if (process.env.ENABLE_CRON !== 'true') return;

    await this.processPendingCollectorTimeouts();
    await this.processOnTheWayTimeouts();
    // await this.processArrivedTimeouts();
    // await this.processInactiveCollectors();
  }

  /**
   * Tự động OFFLINE các Collector không có hoạt động trong 60 phút
   */
  // private async processInactiveCollectors() {
  //   this.logger.log('Scanning for inactive collectors (> 60m)...');

  //   const INACTIVITY_THRESHOLD_MINUTES = 60;
  //   const thresholdDate = new Date(
  //     Date.now() - INACTIVITY_THRESHOLD_MINUTES * 60 * 1000,
  //   );

  //   const inactiveCollectors = await this.prisma.collectorStatus.findMany({
  //     where: {
  //       availability: { not: 'OFFLINE' },
  //       lastActivityAt: { lt: thresholdDate },
  //     },
  //   });

  //   for (const status of inactiveCollectors) {
  //     try {
  //       await this.prisma.collectorStatus.update({
  //         where: { collectorId: status.collectorId },
  //         data: {
  //           availability: 'OFFLINE',
  //           lastOfflineAt: new Date(),
  //         },
  //       });
  //       this.logger.warn(
  //         `Collector ${status.collectorId} set to OFFLINE due to inactivity (> 15m)`,
  //       );
  //     } catch (error) {
  //       this.logger.error(
  //         `Failed to set collector ${status.collectorId} to OFFLINE`,
  //         error,
  //       );
  //     }
  //   }
  // }

  /**
   * Thu hồi các Report đang ARRIVED quá lâu (quá 15p deadline + buffer 30p)
   * Buffer để tránh trường hợp Collector đang thực sự thu gom mà bị fail đơn.
   */
  // private async processArrivedTimeouts() {
  //   this.logger.log('Scanning for stalled ARRIVED reports...');

  //   // Buffer 10 phút sau deadline để an toàn
  //   const now = new Date();
  //   const cleanupThreshold = new Date(now.getTime() - 60 * 60 * 1000);

  //   const stalledReports = await this.prisma.report.findMany({
  //     where: {
  //       status: 'ARRIVED',
  //       arrivalDeadline: { lt: cleanupThreshold },
  //     },
  //     include: {
  //       assignment: true,
  //     },
  //   });

  //   for (const report of stalledReports) {
  //     if (!report.assignment || !report.assignment.collectorId) continue;

  //     const collectorId = report.assignment.collectorId;

  //     try {
  //       await this.prisma.$transaction(async (tx) => {
  //         // 1. Race condition check
  //         const updated = await tx.report.updateMany({
  //           where: { id: report.id, status: 'ARRIVED' },
  //           data: {
  //             status: 'FAILED_NO_RESPONSE',
  //             updatedAt: new Date(),
  //           },
  //         });

  //         if (updated.count === 0) return;

  //         // 2. Update CollectorTaskAttempt
  //         await tx.collectorTaskAttempt.updateMany({
  //           where: {
  //             reportId: report.id,
  //             collectorId: collectorId,
  //             status: 'ACCEPTED',
  //           },
  //           data: { status: 'REJECTED' }, // Mark as failed/rejected
  //         });

  //         // 3. Xóa assignment
  //         await tx.reportAssignment.delete({
  //           where: { reportId: report.id },
  //         });

  //         // 4. Sync Queue & Activity
  //         await this.queueService.decrement(collectorId, tx);
  //         await this.activityService.touch(collectorId, tx);

  //         this.logger.warn(
  //           `Report ${report.id} stalled in ARRIVED. Auto-failed to NO_RESPONSE.`,
  //         );
  //       });
  //     } catch (error) {
  //       this.logger.error(
  //         `Failed to cleanup stalled ARRIVED report ${report.id}`,
  //         error,
  //       );
  //     }
  //   }
  // }

  /**
   * Thu hồi các task mà Collector không xác nhận sau 5 phút
   */
  private async processPendingCollectorTimeouts() {
    this.logger.log('Scanning for expired PENDING_COLLECTOR attempts...');

    const expiredAttempts = await this.prisma.collectorTaskAttempt.findMany({
      where: {
        status: 'PENDING_COLLECTOR',
        expiredAt: { lt: new Date() },
      },
    });

    const EXPIRED_PENALTY = 15;
    const MAX_CONSECUTIVE_SKIPS = 3;

    for (const attempt of expiredAttempts) {
      try {
        await this.prisma.$transaction(async (tx_raw) => {
          const tx = tx_raw as any;
          // 1. Mark as EXPIRED atomically
          const updateAttempt = await tx.collectorTaskAttempt.updateMany({
            where: { id: attempt.id, status: 'PENDING_COLLECTOR' },
            data: { status: 'EXPIRED' },
          });

          if (updateAttempt.count === 0) return;

          // 2. Phạt Collector: Tăng skipCount, giảm trustScore
          await tx.collector.update({
            where: { id: attempt.collectorId },
            data: {
              skipCount: { increment: 1 },
              trustScore: { decrement: EXPIRED_PENALTY },
            },
          });

          // 3. Cập nhật consecutiveSkipCount
          const status = await tx.collectorStatus.update({
            where: { collectorId: attempt.collectorId },
            data: { consecutiveSkipCount: { increment: 1 } } as any,
          });

          // 4. Auto-Offline if threshold reached
          if (status.consecutiveSkipCount >= MAX_CONSECUTIVE_SKIPS) {
            await tx.collectorStatus.update({
              where: { collectorId: attempt.collectorId },
              data: {
                availability: 'OFFLINE',
                lastOfflineAt: new Date(),
              },
            });
            this.logger.warn(
              `Collector ${attempt.collectorId} auto-offline due to ${MAX_CONSECUTIVE_SKIPS} consecutive skips (Expired task)`,
            );
          }

          // 5. Trả Report về trạng thái chờ DN tiếp theo hoặc dispatch lại
          await tx.report.updateMany({
            where: { id: attempt.reportId, status: 'COLLECTOR_PENDING' },
            data: { status: 'ENTERPRISE_RESERVED' },
          });

          this.logger.warn(
            `Attempt ${attempt.id} (PENDING_COLLECTOR) timed out. Reverting report ${attempt.reportId}`,
          );
        });

        // 6. Trigger next dispatch
        this.dispatchService.dispatchToCollector(
          attempt.reportId,
          attempt.enterpriseId,
        );
      } catch (error) {
        this.logger.error(
          `Failed to handle PENDING_COLLECTOR timeout for attempt ${attempt.id}`,
          error,
        );
      }
    }
  }

  /**
   * Thu hồi các Report đang ON_THE_WAY quá 60 phút mà không có tiến triển
   */
  private async processOnTheWayTimeouts() {
    this.logger.log('Scanning for stalled ON_THE_WAY reports (> 60m)...');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stalledReports = await this.prisma.report.findMany({
      where: {
        status: 'ON_THE_WAY',
        updatedAt: { lt: oneHourAgo },
      },
      include: {
        assignment: true,
      },
    });

    for (const report of stalledReports) {
      if (!report.assignment || !report.assignment.collectorId) continue;

      const collectorId = report.assignment.collectorId;

      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Race condition check: Update report status to PENDING
          const updated = await tx.report.updateMany({
            where: { id: report.id, status: 'ON_THE_WAY' },
            data: {
              status: 'PENDING',
              currentEnterpriseId: null,
            },
          });

          // Nếu count = 0 nghĩa là report đã vừa chuyển sang ARRIVED hoặc trạng thái khác
          if (updated.count === 0) return;

          // 2. Update CollectorTaskAttempt (Tìm attempt ACCEPTED hiện tại để mark EXPIRED/TIMEOUT)
          await tx.collectorTaskAttempt.updateMany({
            where: {
              reportId: report.id,
              collectorId: collectorId,
              status: 'ACCEPTED',
            },
            data: { status: 'EXPIRED' },
          });

          // 3. Xóa assignment hiện tại
          await tx.reportAssignment.delete({
            where: { reportId: report.id },
          });

          // 4. Sync Queue & Activity
          await this.queueService.decrement(collectorId, tx);
          await this.activityService.touch(collectorId, tx);

          this.logger.warn(
            `Report ${report.id} stalled in ON_THE_WAY. Reclaimed to PENDING.`,
          );
        });
      } catch (error) {
        this.logger.error(
          `Failed to reclaim stalled report ${report.id}`,
          error,
        );
      }
    }
  }
}
