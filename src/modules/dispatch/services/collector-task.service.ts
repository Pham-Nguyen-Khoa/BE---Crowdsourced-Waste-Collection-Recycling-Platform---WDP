import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { DispatchService } from './dispatch.service';
import { CollectorActivityService } from './collector-activity.service';
import { CollectorQueueService } from './collector-queue.service';
import { getDistance } from 'geolib';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompleteTaskDto } from '../../collector/dtos/complete-task.dto';
import { NotificationService } from '../../notification/services/notification.service';
import { PointTransactionType } from '@prisma/client';
import { SupabaseService } from 'src/modules/supabase/services/supabase.service';
import { errorResponse, successResponse } from 'src/common/utils/response.util';

@Injectable()
export class CollectorTaskService {
  private readonly logger = new Logger(CollectorTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchService: DispatchService,
    private readonly activityService: CollectorActivityService,
    private readonly queueService: CollectorQueueService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
    private readonly supabaseService: SupabaseService,
  ) { }

  async getMyPendingTasks(collectorId: number) {
    const tasks = await this.prisma.collectorTaskAttempt.findMany({
      where: {
        collectorId,
        status: 'PENDING_COLLECTOR',
        expiredAt: { gt: new Date() },
      },
      include: {
        report: {
          include: {
            wasteItems: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedTasks = tasks.map((task) => {
      const { wasteItems, ...reportRest } = task.report;

      const formattedWasteItems = wasteItems.map((item) => ({
        wasteType: item.wasteType,
        weightKg: item.weightKg ? Number(item.weightKg) : null,
      }));

      return {
        ...task,
        report: {
          ...reportRest,
          wasteItems: formattedWasteItems,
        },
      };
    });

    return successResponse(200, formattedTasks, 'Lấy danh sách task thành công');
  }

  /**
   * Chấp nhận nhiệm vụ
   */
  async acceptTask(collectorId: number, attemptId: number) {
    const attempt = await this.prisma.collectorTaskAttempt.findUnique({
      where: { id: attemptId },
      include: { report: true },
    });

    if (!attempt || attempt.collectorId !== collectorId) {
      return errorResponse(404, 'Task attempt not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Race condition check: Mark attempt as ACCEPTED atomically
      const updateAttempt = await tx.collectorTaskAttempt.updateMany({
        where: {
          id: attemptId,
          status: 'PENDING_COLLECTOR',
          expiredAt: { gt: new Date() },
        },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });

      if (updateAttempt.count === 0) {
        return errorResponse(400, 'Nhiệm vụ đã hết hạn hoặc đã được xử lý!');
      }

      // 2. Race condition check: Update Report status
      const updatedReport = await tx.report.updateMany({
        where: { id: attempt.reportId, status: 'COLLECTOR_PENDING' },
        data: { status: 'ASSIGNED' },
      });

      if (updatedReport.count === 0) {
        return errorResponse(400, 'Báo cáo không khả dụng để tiếp nhận');
      }

      // 3. Create ReportAssignment record
      await tx.reportAssignment.create({
        data: {
          reportId: attempt.reportId,
          enterpriseId: attempt.enterpriseId,
          collectorId: collectorId,
          assignedAt: new Date(),
        },
      });

      // 4. Update Collector: queueLength + 1, lastActivityAt
      await this.queueService.increment(collectorId, tx);
      await this.activityService.touch(collectorId, tx);

      // 5. Notify Citizen (Non-blocking)
      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: attempt.report.citizenId,
            title: ' Đã có người nhận thu gom!',
            content:
              'Người thu gom đã tiếp nhận yêu cầu của bạn và sẽ sớm bắt đầu di chuyển tới nới.',
            type: 'REPORT_STATUS_CHANGED',
            meta: { reportId: attempt.reportId, type: 'COLLECTOR_ACCEPTED' },
          });
        } catch (err) {
          this.logger.error(
            `Failed to notify citizen on collector accept for report ${attempt.reportId}`,
            err?.message,
          );
        }
      });

      return successResponse(200, null, 'Xác nhận nhiệm vụ thành công');
    });
  }

  /**
   * Từ chối nhiệm vụ
   */
  async rejectTask(collectorId: number, attemptId: number) {
    const attempt = await this.prisma.collectorTaskAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.collectorId !== collectorId) {
      return errorResponse(404, 'Task attempt not found');
    }

    return this.prisma.$transaction(async (tx_raw) => {
      const tx = tx_raw as any;
      // 1. Race condition check
      const updateAttempt = await tx.collectorTaskAttempt.updateMany({
        where: {
          id: attemptId,
          status: 'PENDING_COLLECTOR',
          expiredAt: { gt: new Date() },
        },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });

      if (updateAttempt.count === 0) {
        return errorResponse(400, 'Nhiệm vụ đã được xử lý hoặc hết hạn');
      }

      // 2. Increment Collector skipCount, consecutiveSkipCount, reduce trustScore & touch activity
      const REJECT_PENALTY = 10;
      const MAX_CONSECUTIVE_SKIPS = 100;

      const collector = await tx.collector.update({
        where: { id: collectorId },
        data: {
          skipCount: { increment: 1 },
          trustScore: { decrement: REJECT_PENALTY },
        },
      });

      const updatedStatus = await tx.collectorStatus.update({
        where: { collectorId },
        data: { consecutiveSkipCount: { increment: 1 } } as any,
      });

      // 2.1 Auto-Offline if consecutive skips reached
      if (updatedStatus.consecutiveSkipCount >= MAX_CONSECUTIVE_SKIPS) {
        await tx.collectorStatus.update({
          where: { collectorId },
          data: {
            availability: 'OFFLINE',
            lastOfflineAt: new Date(),
          },
        });
        this.logger.warn(
          `Collector ${collectorId} auto-offline due to ${MAX_CONSECUTIVE_SKIPS} consecutive skips`,
        );
      }

      await this.activityService.touch(collectorId, tx);

      // 3. Revert Report status back to ENTERPRISE_RESERVED to trigger next dispatch
      await tx.report.updateMany({
        where: { id: attempt.reportId, status: 'COLLECTOR_PENDING' },
        data: { status: 'ENTERPRISE_RESERVED' },
      });

      // 4. Trigger next dispatch attempt (Async)
      setTimeout(() => {
        this.dispatchService
          .dispatchToCollector(attempt.reportId, attempt.enterpriseId)
          .catch((e) =>
            this.logger.error('Background dispatch failed after reject', e),
          );
      }, 1000);

      const message =
        updatedStatus.consecutiveSkipCount >= MAX_CONSECUTIVE_SKIPS
          ? 'Đã từ chối nhiệm vụ. Bạn đã bị chuyển sang ngoại tuyến do từ chối nhiều lần liên tiếp.'
          : 'Đã từ chối nhiệm vụ';

      return successResponse(200, null, message);
    });
  }

  /**
   * Collector bắt đầu di chuyển
   */
  async startMoving(collectorId: number, reportId: number) {
    return this.prisma.$transaction(async (tx_raw) => {
      const tx = tx_raw as any;
      // 1. Verify assignment
      const assignment = await tx.reportAssignment.findUnique({
        where: { reportId },
        include: { report: { select: { citizenId: true } } },
      });

      if (!assignment || assignment.collectorId !== collectorId) {
        return errorResponse(403, 'Bạn không được phân công nhiệm vụ này');
      }

      // 2. Atomic update ASSIGNED → ON_THE_WAY
      const updated = await tx.report.updateMany({
        where: { id: reportId, status: 'ASSIGNED' },
        data: { status: 'ON_THE_WAY', updatedAt: new Date() },
      });

      if (updated.count === 0) {
        return errorResponse(
          400,
          'Trạng thái báo cáo không hợp lệ để bắt đầu di chuyển',
        );
      }

      // 3. Sync Activity
      await this.activityService.touch(collectorId, tx);

      // 4. Notify Citizen (Non-blocking)
      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: assignment.report.citizenId,
            title: '🏃 Người thu gom đang di chuyển!',
            content:
              'Người thu gom đang trên đường tới điểm của bạn. Vui lòng chú ý điện thoại hoặc ứng dụng.',
            type: 'REPORT_STATUS_CHANGED',
            meta: { reportId, type: 'COLLECTOR_MOVING' },
          });
        } catch (err) {
          this.logger.error(
            `Failed to notify citizen on collector moving for report ${reportId}`,
            err?.message,
          );
        }
      });

      return successResponse(200, null, 'Bắt đầu di chuyển');
    });
  }

  /**
   * Collector check-in tại điểm thu gom → ARRIVED
   * Sau khi thành công, sẽ notify cho Citizen qua WebSocket
   */
  async checkInArrival(
    collectorId: number,
    reportId: number,
    lat: number,
    lng: number,
  ) {
    const CHECKIN_RADIUS_METERS = 300;
    const ARRIVAL_CONFIRM_WINDOW = 60 * 60 * 1000;

    return this.prisma.$transaction(async (tx_raw) => {
      const tx = tx_raw as any;

      /**
       * 1️⃣ Verify assignment
       */
      const assignment = await tx.reportAssignment.findUnique({
        where: { reportId },
      });

      if (!assignment || assignment.collectorId !== collectorId) {
        return errorResponse(403, 'Bạn không được phân công nhiệm vụ này');
      }

      /**
       * 2️⃣ Fetch report
       */
      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: {
          latitude: true,
          longitude: true,
          citizenId: true,
          status: true,
        },
      });

      if (!report) {
        return errorResponse(404, 'Không tìm thấy báo cáo');
      }

      /**
       * 3️⃣ Validate status
       */
      if (report.status !== 'ON_THE_WAY') {
        return errorResponse(
          400,
          'Chỉ có thể check-in khi đang ở trạng thái ON_THE_WAY',
        );
      }

      /**
       * 4️⃣ Validate distance
       */
      const distanceMeters = getDistance(
        { latitude: lat, longitude: lng },
        { latitude: report.latitude, longitude: report.longitude },
      );

      if (distanceMeters > CHECKIN_RADIUS_METERS) {
        return errorResponse(
          400,
          `Bạn đang cách điểm thu gom ${distanceMeters}m. Cần <= ${CHECKIN_RADIUS_METERS}m để check-in.`,
        );
      }

      /**
       * 5️⃣ Update report → ARRIVED
       */
      const now = new Date();
      const arrivalDeadline = new Date(now.getTime() + ARRIVAL_CONFIRM_WINDOW);

      await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'ARRIVED',
          arrivedAt: now,
          arrivalDeadline,
        },
      });

      /**
       * 6️⃣ Sync collector activity
       */
      await this.activityService.touch(collectorId, tx);

      /**
       * 7️⃣ Notify citizen (non-blocking)
       */
      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: report.citizenId,
            title: '🚛 Người thu gom đã đến!',
            content:
              'Người thu gom đã có mặt tại điểm của bạn. Bạn có 15 phút để mang rác ra và xác nhận bạn đang có mặt.',
            type: 'REPORT_STATUS_CHANGED',
            meta: {
              reportId,
              arrivalDeadline: arrivalDeadline.toISOString(),
              type: 'COLLECTOR_ARRIVED',
              action: 'confirm-presence',
            },
          });
        } catch (err) {
          this.logger.error(
            `Failed notifying citizen for report ${reportId}`,
            err?.message,
          );
        }
      });

      return successResponse(
        200,
        {
          message:
            'Check-in thành công. Bạn có 15 phút để hoàn tất hoặc báo vắng khách.',
          arrivalDeadline,
          distanceMeters,
        },
        'Check-in thành công',
      );
    });
  }

  /**
   * Phase 8 – Hoàn tất vật lý (ARRIVED → COLLECTED)
   * Emit event để RewardService xử lý điểm thưởng bất đồng bộ
   */
  async completeTask(
    collectorId: number,
    dto: CompleteTaskDto,
    files?: Express.Multer.File[],
  ) {
    // 1. Validation trước transaction
    const assignment = await this.prisma.reportAssignment.findUnique({
      where: { reportId: Number(dto.reportId) },
      include: {
        report: {
          include: { wasteItems: true },
        },
      },
    });

    if (!assignment || assignment.collectorId !== collectorId) {
      return errorResponse(403, 'Bạn không được phân công nhiệm vụ này');
    }

    if (assignment.report.status !== 'ARRIVED') {
      return errorResponse(
        400,
        'Chỉ có thể hoàn tất khi đã ở trạng thái ARRIVED',
      );
    }

    const lastAttempt = await this.prisma.collectorTaskAttempt.findFirst({
      where: { reportId: Number(dto.reportId), collectorId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastAttempt || lastAttempt.status !== 'ACCEPTED') {
      return errorResponse(400, 'Trạng thái nhiệm vụ không hợp lệ');
    }

    // 2. Validate weight inputs vs report wasteItems
    const reportWasteTypes = assignment.report.wasteItems.map((w) => w.wasteType);

    const weightMap: Record<string, number | null | undefined> = {
      ORGANIC: dto.weightOrganic,
      RECYCLABLE: dto.weightRecyclable,
      HAZARDOUS: dto.weightHazardous,
    };

    // Các loại rác có trong report phải được truyền weight
    const missingTypes: string[] = [];
    for (const wasteType of reportWasteTypes) {
      const w = weightMap[wasteType];
      if (w === undefined || w === null) {
        missingTypes.push(wasteType);
      }
    }

    if (missingTypes.length > 0) {
      return errorResponse(
        400,
        `Thiếu cân nặng cho loại rác: ${missingTypes.join(', ')}. Report có các loại: ${reportWasteTypes.join(', ')}.`,
      );
    }

    // Tính actualWeight tổng và danh sách chi tiết
    let totalActualWeight = 0;
    const perTypeWeights: { wasteType: string; weight: number }[] = [];
    for (const wasteType of reportWasteTypes) {
      const w = Number(weightMap[wasteType]);
      totalActualWeight += w;
      perTypeWeights.push({ wasteType, weight: w });
    }

    // 3. Upload images if any
    let uploadedImageUrls: string[] = [];
    if (files && files.length > 0) {
      uploadedImageUrls = await this.supabaseService.uploadImages(
        files,
        'complete-reports',
      );
    }

    // 4. Transaction: Hoàn tất vật lý
    const result = await this.prisma.$transaction(async (tx_raw) => {
      const tx = tx_raw as any;
      // Atomic update status ARRIVED → COLLECTED
      const updatedReport = await tx.report.updateMany({
        where: { id: Number(dto.reportId), status: 'ARRIVED' },
        data: {
          status: 'COLLECTED',
          collectedAt: new Date(),
          actualWeight: totalActualWeight,
          accuracyBucket: dto.accuracyBucket,
          evidenceImages: uploadedImageUrls,
          updatedAt: new Date(),
        },
      });

      // Idempotent guard
      if (updatedReport.count === 0) return null;

      // Update CollectorTaskAttempt
      await tx.collectorTaskAttempt.updateMany({
        where: { id: lastAttempt.id, status: 'ACCEPTED' },
        data: { status: 'COLLECTED' },
      });

      // Giải phóng queue
      await this.queueService.decrement(collectorId, tx);
      await this.activityService.touch(collectorId, tx);

      return {
        reportId: assignment.report.id,
        citizenId: assignment.report.citizenId,
        collectorId: collectorId,
        perTypeWeights,
        totalActualWeight,
        accuracyBucket: dto.accuracyBucket,
        arrivedAt: assignment.report.arrivedAt,
        collectedAt: new Date(),
      };
    });

    if (!result)
      return successResponse(200, null, 'Nhiệm vụ đã được hoàn tất trước đó');

    // 5. Phát sự kiện nội bộ → RewardService sẽ xử lý điểm thưởng & notify
    this.eventEmitter.emit('report.collected', result);

    return successResponse(
      200,
      {
        reportId: result.reportId,
        totalActualWeight: result.totalActualWeight,
        perTypeWeights: result.perTypeWeights,
        accuracyBucket: result.accuracyBucket,
        evidenceImages: uploadedImageUrls,
      },
      'Thu gom thành công. Đang xử lý phần thưởng...',
    );
  }

  /**
   * Báo vắng khách (ARRIVED → FAILED_NO_RESPONSE)
   * Guards:
   *   – Phải đủ 15 phút kể từ khi ARRIVED
   *   – Citizen CHƯA được confirm presence
   */
  async markNoResponse(collectorId: number, reportId: number) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.reportAssignment.findUnique({
        where: { reportId },
      });
      if (!assignment || assignment.collectorId !== collectorId) {
        return errorResponse(403, 'Bạn không được phân công nhiệm vụ này');
      }

      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: {
          arrivalDeadline: true,
          status: true,
          citizenId: true,
          citizenConfirmedAt: true,
        },
      });

      if (!report) return errorResponse(404, 'Không tìm thấy báo cáo');

      // Guard 1: Citizen đã xác nhận có mặt → không cho báo vắng
      if (report.citizenConfirmedAt) {
        return errorResponse(
          400,
          'Citizen đã xác nhận có mặt tại điểm thu gom. Bạn không thể báo vắng.',
        );
      }

      // Guard 2: Chưa đủ 15 phút
      const now = new Date();
      if (
        report.status === 'ARRIVED' &&
        report.arrivalDeadline &&
        now < report.arrivalDeadline
      ) {
        const remaining = Math.ceil(
          (report.arrivalDeadline.getTime() - now.getTime()) / 60000,
        );
        return errorResponse(
          400,
          `Chưa đủ 15 phút. Bạn còn phải đợi ${remaining} phút nữa.`,
        );
      }

      // Atomic update ARRIVED → FAILED_NO_RESPONSE
      const updated = await tx.report.updateMany({
        where: { id: reportId, status: 'ARRIVED' },
        data: { status: 'FAILED_NO_RESPONSE', updatedAt: now },
      });

      if (updated.count === 0)
        return errorResponse(400, 'Không thể cập nhật trạng thái này');

      // Update attempt status
      await tx.collectorTaskAttempt.updateMany({
        where: { reportId, collectorId, status: 'ACCEPTED' },
        data: { status: 'REJECTED' },
      });

      // Cleanup: xóa assignment, giải phóng queue
      await tx.reportAssignment.delete({ where: { reportId } });
      await this.queueService.decrement(collectorId, tx);
      await this.activityService.touch(collectorId, tx);

      // [NON-BLOCKING] Notify Citizen
      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: report.citizenId,
            title: '⚠️ Người thu gom không gặp được bạn',
            content:
              'Người thu gom đã đến điểm của bạn nhưng không thể liên hệ được.',
            type: 'REPORT_STATUS_CHANGED',
            meta: { reportId, type: 'NO_RESPONSE' },
          });
        } catch (err) {
          this.logger.error(
            `Failed to notify citizen on NO_RESPONSE for report ${reportId}`,
            err?.message,
          );
        }
      });

      return successResponse(200, null, 'Đã ghi nhận vắng khách.');
    });
  }

  /**
   * Báo cáo lừa đảo / Sự cố (Dispute) - ARRIVED → CANCELLED
   */
  async reportFake(
    collectorId: number,
    reportId: number,
    files: Express.Multer.File[],
    reason: string,
  ) {
    if (!files || files.length === 0) {
      return errorResponse(
        400,
        'Bắt buộc phải có hình ảnh làm bằng chứng sự cố / lừa đảo',
      );
    }

    const uploadedImageUrls = await this.supabaseService.uploadImages(
      files,
      'disputes',
    );

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.reportAssignment.findUnique({
        where: { reportId },
      });
      if (!assignment || assignment.collectorId !== collectorId) {
        return errorResponse(403, 'Bạn không được phân công nhiệm vụ này');
      }

      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: { status: true, citizenId: true },
      });

      if (!report) return errorResponse(404, 'Không tìm thấy báo cáo');
      if (report.status !== 'ARRIVED') {
        return errorResponse(
          400,
          'Chỉ có thể báo cáo sự cố khi đã đến điểm thu gom (ARRIVED)',
        );
      }

      const now = new Date();

      await tx.report.updateMany({
        where: { id: reportId, status: 'ARRIVED' },
        data: {
          status: 'CANCELLED',
          cancelReason: `Báo cáo sự cố từ Collector: ${reason}`,
          evidenceImages: uploadedImageUrls,
          updatedAt: now,
        },
      });

      await tx.collectorTaskAttempt.updateMany({
        where: { reportId, collectorId, status: 'ACCEPTED' },
        data: { status: 'REJECTED' },
      });

      await tx.reportAssignment.delete({ where: { reportId } });
      await this.queueService.decrement(collectorId, tx);
      await this.activityService.touch(collectorId, tx);

      const penaltyPoint = 50;
      const updatedCitizen = await tx.user.update({
        where: { id: report.citizenId },
        data: { balance: { decrement: penaltyPoint } },
        select: { balance: true },
      });

      await tx.pointTransaction.create({
        data: {
          reportId,
          userId: report.citizenId,
          type: PointTransactionType.SPEND,
          amount: penaltyPoint,
          balanceAfter: updatedCitizen.balance,
          description: `Bị trừ uy tín do báo cáo sự cố không có rác (Lý do: ${reason})`,
        },
      });

      setImmediate(async () => {
        try {
          await this.notificationService.createAndNotify({
            userId: report.citizenId,
            title: '⚠️ Báo cáo của bạn bị đánh dấu sự cố',
            content: `Báo cáo sự cố từ người thu gom (Lý do: ${reason}). Bạn đã bị trừ ${penaltyPoint} điểm.`,
            type: 'REPORT_STATUS_CHANGED',
            meta: { reportId, type: 'DISPUTE_REPORTED', penaltyPoint },
          });
        } catch (err) {
          this.logger.error(
            `Failed to notify citizen on dispute for report ${reportId}`,
            err?.message,
          );
        }
      });

      return successResponse(200, null, 'Đã gửi báo cáo sự cố thành công.');
    });
  }
}
