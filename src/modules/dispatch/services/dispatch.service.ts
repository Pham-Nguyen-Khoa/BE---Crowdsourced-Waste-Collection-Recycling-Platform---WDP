import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import {
  ReportStatus,
  CollectorTaskStatus,
  CollectorAvailability,
} from '@prisma/client';
import * as geolib from 'geolib';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) { }

  async dispatchToCollector(reportId: number, enterpriseId: number) {
    this.logger.log(
      `Initiating dispatch for report ${reportId} (Enterprise ${enterpriseId})`,
    );

    // 1. Fetch Report details
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      this.logger.error(`Report ${reportId} not found`);
      return null;
    }

    // 3. Find candidates
    const allCandidates = await this.prisma.collector.findMany({
      where: {
        enterpriseId,
        isActive: true,
        deletedAt: null,
        user: {
          status: "ACTIVE"
        },
        status: {
          availability: {
            in: [
              CollectorAvailability.ONLINE_AVAILABLE,
              CollectorAvailability.ONLINE_BUSY,
            ],
          },
          queueLength: { lt: 6 },
        },
        collectorTaskAttempts: {
          none: { reportId },
        },
      },
      include: {
        status: true,
        user: true,
      },
    });

    // 4. Working Hours Filter (Pre-sorting)
    const candidates = allCandidates.filter((c) =>
      this.isWorkingHour(c.workingHours),
    );

    if (candidates.length === 0) {
      this.logger.warn(
        `No available candidates (in working hours) for report ${reportId}`,
      );
      await this.handleEnterpriseFallback(reportId, enterpriseId);
      return null;
    }

    // 5. Fair Distribution Sorting
    const sortedCandidates = candidates
      .map((c) => {
        const distance =
          c.status?.currentLatitude && c.status?.currentLongitude
            ? geolib.getDistance(
              {
                latitude: c.status.currentLatitude,
                longitude: c.status.currentLongitude,
              },
              { latitude: report.latitude, longitude: report.longitude },
            )
            : 999999;

        return { ...c, distance };
      })
      .sort((a, b) => {
        // P1: queueLength (Less is better)
        if ((a.status?.queueLength ?? 0) !== (b.status?.queueLength ?? 0)) {
          return (a.status?.queueLength ?? 0) - (b.status?.queueLength ?? 0);
        }

        // // P2: trustScore (Higher is better)
        // if (a.trustScore !== b.trustScore) {
        //     return b.trustScore - a.trustScore;
        // }

        // // P3: distance (Closer is better)
        // if (a.distance !== b.distance) {
        //     return a.distance - b.distance;
        // }

        // P4: lastAssignedAt (Older is better to spread tasks)
        const timeA = (a.status as any)?.lastAssignedAt?.getTime() ?? 0;
        const timeB = (b.status as any)?.lastAssignedAt?.getTime() ?? 0;
        return timeA - timeB;
      });

    this.logger.log(
      `Found ${sortedCandidates.length} eligible candidates for report ${reportId}. Top candidate: ${sortedCandidates[0]?.id}`,
    );

    // 6. Concurrency Strategy: SELECT FOR UPDATE SKIP LOCKED
    for (const candidate of sortedCandidates) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // SQL query for atomic lock
          const locks = await tx.$queryRawUnsafe<any[]>(
            `SELECT "collectorId" FROM "CollectorStatus" WHERE "collectorId" = ${candidate.id} AND "availability" IN ('ONLINE_AVAILABLE', 'ONLINE_BUSY') FOR UPDATE SKIP LOCKED`,
          );

          if (locks.length === 0) return null;

          // Locked successfully!
          const attemptCount = await tx.collectorTaskAttempt.count({
            where: { reportId },
          });

          const attempt = await tx.collectorTaskAttempt.create({
            data: {
              reportId,
              collectorId: candidate.id,
              enterpriseId,
              attemptOrder: attemptCount + 1,
              status: 'PENDING_COLLECTOR',
              expiredAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            },
          });

          await tx.report.update({
            where: { id: reportId },
            data: { status: 'COLLECTOR_PENDING' as any },
          });

          // Update lastAssignedAt
          await tx.collectorStatus.update({
            where: { collectorId: candidate.id },
            data: { lastAssignedAt: new Date() } as any,
          });

          return attempt;
        });

        if (result) {
          // 6. Notify Collector via WS
          await this.notificationService.createAndNotify({
            userId: candidate.userId,
            title: 'Nhiệm vụ thu gom mới',
            content: `Bạn có 5 phút để xác nhận nhiệm vụ thu gom mới (Report #${reportId})`,
            type: 'SYSTEM',
            meta: { reportId, attemptId: result.id, type: 'NEW_TASK' },
          });

          // 4. Log to DB
          await this.prisma.dispatchLog.create({
            data: {
              level: 'INFO',
              message: `Report ${reportId} dispatched to collector ${candidate.id}`,
              meta: {
                reportId,
                collectorId: candidate.id,
                attemptId: result.id,
              },
            },
          });

          return result;
        }
      } catch (error) {
        this.logger.error(
          `Failed to dispatch to collector ${candidate.id}`,
          error,
        );
      }
    }

    this.logger.warn(
      `All candidate locks failed for report ${reportId}, triggering fallback`,
    );
    await this.handleEnterpriseFallback(reportId, enterpriseId);
    return null;
  }

  private isWorkingHour(workingHours: any): boolean {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const time = now.getHours() * 100 + now.getMinutes();

    const config = workingHours?.[day];
    if (!config || !config.active) return false;

    const start = parseInt(config.start.replace(':', ''));
    const end = parseInt(config.end.replace(':', ''));
    return time >= start && time <= end;
  }

  private async handleEnterpriseFallback(
    reportId: number,
    enterpriseId: number,
  ) {
    this.logger.warn(
      `Enterprise Fallback triggered for report ${reportId} (Enterprise ${enterpriseId} cannot fulfill)`,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        // Mark current enterprise attempt as EXPIRED
        await tx.reportEnterpriseAttempt.updateMany({
          where: { reportId, enterpriseId, status: 'ACCEPTED' },
          data: { status: 'EXPIRED' },
        });

        // Reset report to PENDING so cron can pick it up
        await tx.report.update({
          where: { id: reportId },
          data: {
            status: 'PENDING',
            currentEnterpriseId: null,
          },
        });

        // Remove the report from this Enterprise's "Accepted" tab
        await tx.reportAssignment.deleteMany({
          where: { reportId, enterpriseId }
        });
      });

      // Log dispatch
      await this.prisma.dispatchLog.create({
        data: {
          level: 'WARN',
          message: `Enterprise Fallback triggered for report ${reportId}, returned to PENDING`,
          meta: { reportId, failedEnterpriseId: enterpriseId },
        },
      });

      this.logger.log(
        `Successfully applied fallback. Report ${reportId} is back to PENDING`,
      );
    } catch (error) {
      this.logger.error(
        `Error during handleEnterpriseFallback for report ${reportId}:`,
        error,
      );
    }
  }
}
