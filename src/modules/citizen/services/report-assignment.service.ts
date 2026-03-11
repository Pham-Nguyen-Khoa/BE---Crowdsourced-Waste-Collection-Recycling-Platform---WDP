import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { errorResponse, successResponse } from 'src/common/utils/response.util';
import { NotificationGateway } from '../../notification/gateways/notification.gateway';
import { DispatchService } from '../../dispatch/services/dispatch.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class ReportAssignmentService {
  private readonly logger = new Logger(ReportAssignmentService.name);

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
    private dispatchService: DispatchService,
    private notificationService: NotificationService,
  ) { }

  async enterpriseAccept(reportId: number, userId: number) {
    const enterprise = await this.prisma.enterprise.findFirst({
      where: { userId },
      select: { id: true, name: true },
    });

    if (!enterprise) {
      return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep');
    }

    const enterpriseId = enterprise.id;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Atomic Update status PENDING -> ENTERPRISE_RESERVED
        const reportUpdate = await tx.report.updateMany({
          where: { id: reportId, status: 'PENDING' },
          data: {
            status: 'ENTERPRISE_RESERVED',
            currentEnterpriseId: enterpriseId,
          },
        });

        if (reportUpdate.count === 0) {
          const check = await tx.report.findUnique({ where: { id: reportId } });
          if (!check) throw new Error('Báo cáo không tồn tại');
          throw new Error(
            `Báo cáo đang ở trạng thái "${check.status}", không thể chấp nhận`,
          );
        }

        // 2. Mark attempt as ACCEPTED
        await tx.reportEnterpriseAttempt.updateMany({
          where: { reportId, enterpriseId, status: 'WAITING' },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        });

        // 3. Mark other attempts as EXPIRED
        await tx.reportEnterpriseAttempt.updateMany({
          where: { reportId, status: 'WAITING' },
          data: { status: 'EXPIRED', respondedAt: new Date() },
        });

        // Create ReportAssignment so it appears in the Enterprise's "Accepted" tab
        // since it is now being processed by this Enterprise (waiting for a Collector).
        await tx.reportAssignment.create({
          data: {
            reportId,
            enterpriseId,
            collectorId: null,
            assignedAt: new Date(),
          },
        });

        return { success: true };
      });

      // 4. Trigger auto-dispatch (Background)
      setTimeout(() => {
        this.dispatchService
          .dispatchToCollector(reportId, enterpriseId)
          .then((res) => {
            if (!res)
              this.logger.warn(
                `No collector found for auto-dispatch of report ${reportId}`,
              );
          });
      }, 500);

      return successResponse(
        200,
        null,
        'Đã đặt chỗ báo cáo. Hệ thống đang tìm người thu gom phù hợp.',
      );
    } catch (error) {
      this.logger.error('Error in enterpriseAccept:', error);
      return errorResponse(400, error.message || 'Lỗi xử lý đặt chỗ báo cáo');
    }
  }

  async enterpriseReject(reportId: number, userId: number) {
    const enterprise = await this.prisma.enterprise.findFirst({
      where: { userId },
      select: { id: true, name: true },
    });

    if (!enterprise) {
      return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep');
    }

    const enterpriseId = enterprise.id;

    const attempt = await this.prisma.reportEnterpriseAttempt.findUnique({
      where: {
        reportId_enterpriseId: { reportId, enterpriseId },
      },
    });

    if (!attempt || attempt.status !== 'WAITING') {
      return errorResponse(400, 'Ban khong co quyen phan tich bao cao');
    }

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { deletedAt: true, status: true },
    });

    if (report?.deletedAt) {
      return errorResponse(
        400,
        'Báo cáo đã bị hủy bởi citizen',
        'REPORT_CANCELLED',
      );
    }

    await this.prisma.reportEnterpriseAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
      },
    });

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'PENDING',
        currentEnterpriseId: null,
      },
    });

    return successResponse(
      200,
      null,
      'Doanh nghiep da tu choi bao cao rac nay  ',
    );
  }

  async handleTimeoutAttempts(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const timeoutAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
      where: {
        status: 'WAITING',
        expiredAt: { lte: new Date() },
        // sentAt: { lt: tenMinutesAgo }
      },
      include: {
        report: {
          include: {
            citizen: {
              select: { id: true },
            },
          },
        },
      },
    });

    for (const attempt of timeoutAttempts) {
      // Skip nếu report đã bị hủy
      if (!attempt.report || attempt.report.deletedAt) {
        this.logger.log(
          `⏰ Attempt ${attempt.id} thuộc report đã bị hủy, bỏ qua`,
        );
        continue;
      }

      await this.prisma.reportEnterpriseAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'EXPIRED',
          respondedAt: new Date(),
        },
      });

      await this.prisma.report.update({
        where: { id: attempt.reportId },
        data: {
          status: 'PENDING',
          currentEnterpriseId: null,
        },
      });

      // Notify Citizen khi enterprise attempt hết hạn (non-blocking)
      if (attempt.report?.citizen?.id) {
        setImmediate(async () => {
          try {
            await this.notificationService.createAndNotify({
              userId: attempt.report.citizen.id,
              type: NotificationType.REPORT_STATUS_CHANGED,
              title: '⏰ Chưa tìm được doanh nghiệp phù hợp',
              content:
                'Báo cáo của bạn đang được hệ thống tiếp tục tìm kiếm doanh nghiệp thu gom phù hợp. Vui lòng chờ thêm.',
              meta: {
                reportId: attempt.reportId,
                action: 'ENTERPRISE_EXPIRED',
              },
            });
          } catch (err) {
            this.logger.error(
              `Failed to notify citizen on enterprise timeout for report ${attempt.reportId}`,
              err?.message,
            );
          }
        });
      }

      this.logger.log(
        `⏰ Attempt ${attempt.id} hết thời gian - báo cáo ${attempt.reportId} trả về PENDING`,
      );
    }
  }

  async getAllWaitingReports(userId: number) {
    const enterprise = await this.prisma.enterprise.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!enterprise) {
      return errorResponse(400, 'Ban khong co quyen truy cap doanh nghiep');
    }

    const enterpriseId = enterprise.id;

    const waitingAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
      where: {
        enterpriseId,
        status: 'WAITING',
      },
      include: {
        report: {
          include: {
            citizen: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    const reports = waitingAttempts.map((attempt) => ({
      ...attempt.report,
      sentAt: attempt.sentAt,
      attemptId: attempt.id,
    }));

    this.logger.log(
      `📋 Doanh nghiệp ${enterpriseId} lấy ${reports.length} báo cáo đang đợi phản hồi`,
    );

    return successResponse(
      200,
      reports,
      `Lay thanh cong ${reports.length} bao cao dang doi phan hoi`,
    );
  }
}
