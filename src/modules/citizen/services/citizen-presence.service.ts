import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { CollectorQueueService } from '../../dispatch/services/collector-queue.service';
import { ReportStatus } from '@prisma/client';

@Injectable()
export class CitizenPresenceService {
  private readonly logger = new Logger(CitizenPresenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly queueService: CollectorQueueService,
  ) {}

  /**
   * Citizen xác nhận đang có mặt khi Collector đã ARRIVED
   * POST /citizen/reports/:reportId/confirm-presence
   */
  async confirmPresence(citizenId: number, reportId: number) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        citizenId: true,
        status: true,
        arrivalDeadline: true,
        citizenConfirmedAt: true,
        assignment: {
          select: {
            collectorId: true,
            collector: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    // Guard 1: Đúng citizen
    if (report.citizenId !== citizenId) {
      throw new ForbiddenException(
        'Bạn không có quyền thao tác với báo cáo này',
      );
    }

    // Guard 2: Chỉ confirm khi status = ARRIVED
    if (report.status !== 'ARRIVED') {
      throw new BadRequestException(
        `Không thể xác nhận có mặt ở trạng thái "${report.status}". Chỉ có thể xác nhận khi người thu gom đã đến.`,
      );
    }

    // Guard 3: Chưa confirm trước đó (idempotent)
    if (report.citizenConfirmedAt) {
      return {
        message: 'Bạn đã xác nhận có mặt trước đó.',
        confirmedAt: report.citizenConfirmedAt,
      };
    }

    const now = new Date();

    // Atomic update: ghi nhận citizenConfirmedAt
    const updated = await this.prisma.report.updateMany({
      where: {
        id: reportId,
        status: 'ARRIVED',
        citizenConfirmedAt: null, // idempotent double-confirm guard
      },
      data: {
        citizenConfirmedAt: now,
        updatedAt: now,
      },
    });

    if (updated.count === 0) {
      // Có thể race condition – lấy lại giá trị hiện tại
      const current = await this.prisma.report.findUnique({
        where: { id: reportId },
        select: { citizenConfirmedAt: true },
      });
      return {
        message: 'Xác nhận có mặt đã được ghi nhận.',
        confirmedAt: current?.citizenConfirmedAt ?? now,
      };
    }

    this.logger.log(
      `Citizen ${citizenId} confirmed presence for report ${reportId}`,
    );

    // [NON-BLOCKING] Notify Collector rằng Citizen đã có mặt
    const collectorUserId = report.assignment?.collector?.userId;
    if (collectorUserId) {
      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: collectorUserId,
            title: '✅ Công dân đã xác nhận có mặt',
            content: `Công dân đã xác nhận đang ở tại điểm thu gom cho báo cáo #${reportId}. Vui lòng tiến hành thu gom.`,
            type: 'REPORT_STATUS_CHANGED',
            meta: {
              reportId,
              type: 'CITIZEN_CONFIRMED_PRESENCE',
              citizenConfirmedAt: now.toISOString(),
            },
          });
          this.logger.log(
            `Notified collector (user ${collectorUserId}) of citizen presence for report ${reportId}`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to notify collector on citizen presence for report ${reportId}`,
            err?.message,
          );
        }
      });
    }

    return {
      message:
        'Đã xác nhận bạn đang có mặt. Vui lòng mang rác ra để người thu gom tiến hành.',
      confirmedAt: now,
    };
  }

  /**
   * Citizen chủ động báo mình sẽ vắng mặt (tùy chọn)
   * POST /citizen/reports/:reportId/report-absent
   * Dùng khi Citizen biết trước mình không thể có mặt → warn Collector
   */
  async reportAbsent(citizenId: number, reportId: number) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        citizenId: true,
        status: true,
        citizenConfirmedAt: true,
        citizenAbsentAt: true,
        assignment: {
          select: {
            collectorId: true,
            collector: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');

    // 1. Kiểm tra quyền sở hữu
    if (report.citizenId !== citizenId) {
      throw new ForbiddenException(
        'Bạn không có quyền thao tác với báo cáo này',
      );
    }

    // 2. Idempotent check (Nếu đã ở trạng thái kết thúc thì không báo vắng nữa)
    if (report.status === ('FAILED_CITIZEN_NOT_HOME' as any)) {
      return {
        message: 'Bạn đã báo vắng mặt cho báo cáo này.',
        status: report.status,
        absentAt: report.citizenAbsentAt,
      };
    }

    // 3. Chỉ báo vắng khi status đang là ARRIVED
    if (report.status !== ('ARRIVED' as any)) {
      throw new BadRequestException(
        `Chỉ có thể báo vắng khi người thu gom đã đến (trạng thái ARRIVED). Hiện tại: ${report.status}`,
      );
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Update Report status
      await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'FAILED_CITIZEN_NOT_HOME' as any,
          citizenAbsentAt: now,
          updatedAt: now,
        },
      });

      // 2. Cleanup Assignment & Update Collector Stats
      if (report.assignment?.collectorId) {
        const collectorId = report.assignment.collectorId;

        // Cleanup assignment
        await tx.reportAssignment.delete({ where: { reportId } });

        // Update collector attempt status
        await tx.collectorTaskAttempt.updateMany({
          where: { reportId, collectorId, status: 'ACCEPTED' },
          data: { status: 'REJECTED' },
        });

        // Decrement queue via service
        await this.queueService.decrement(collectorId, tx);
      }
    });

    this.logger.log(
      `Citizen ${citizenId} self-reported ABSENT for report ${reportId}. Report marked as FAILED_CITIZEN_NOT_HOME.`,
    );

    // [NON-BLOCKING] Notify Collector rằng Citizen báo vắng
    const collectorUserId = report.assignment?.collector?.userId;
    if (collectorUserId) {
      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: collectorUserId,
            title: '⚠️ Công dân báo vắng mặt - Nhiệm vụ kết thúc',
            content: `Công dân đã xác nhận vắng mặt cho báo cáo #${reportId}. Nhiệm vụ của bạn đã được đóng và không bị tính lỗi.`,
            type: 'CUSTOMER_NOT_FOUND',
            meta: {
              reportId,
              type: 'CITIZEN_SELF_ABSENT',
              citizenAbsentAt: now.toISOString(),
            },
          });
        } catch (err) {
          this.logger.error(
            `Failed to notify collector on citizen self-absent for report ${reportId}`,
            err?.message,
          );
        }
      });
    }

    return {
      message: 'Đã xác nhận bạn vắng mặt. Báo cáo này đã kết thúc.',
      status: 'FAILED_CITIZEN_NOT_HOME',
      absentAt: now,
    };
  }
}
