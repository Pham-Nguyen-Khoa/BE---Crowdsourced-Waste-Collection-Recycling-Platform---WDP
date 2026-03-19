import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { RespondComplaintDto } from '../dtos/respond-complaint.dto';
import { NotificationService } from '../../notification/services/notification.service';
import { successResponse, errorResponse } from 'src/common/utils/response.util';
import { PointTransactionType } from '@prisma/client';

@Injectable()
export class AdminComplaintService {
  private readonly logger = new Logger(AdminComplaintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) { }

  private getComplaintTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ATTITUDE: 'Thái độ không tốt',
      WEIGHT_MISMATCH: 'Sai cân nặng thực tế',
      UNAUTHORIZED_FEE: 'Thu phí ngoài quy định',
      NO_SHOW: 'Không đến thu gom',
      OTHER: 'Khác',
    };
    return labels[type] || 'Khác';
  }

  async getAllComplaints(query: any) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [total, complaintsData] = await Promise.all([
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.findMany({
        where,
        include: {
          citizen: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatar: true,
              phone: true,
              _count: {
                select: {
                  complaints: true,
                  reportedFakes: true,
                },
              },
            },
          },
          report: {
            include: {
              assignment: {
                include: {
                  collector: {
                    include: {
                      user: {
                        select: { fullName: true, email: true, avatar: true },
                      },
                      _count: {
                        select: {
                          collectorTaskAttempts: true,
                        },
                      },
                    },
                  },
                },
              },
              images: true,
              wasteItems: true,
              actualWasteItems: true,
            },
          },
        },
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedComplaints = complaintsData.map((c) => {
      const report = c.report;
      const collector = report.assignment?.collector;

      return {
        id: c.id,
        type: c.type,
        typeLabel: this.getComplaintTypeLabel(c.type),
        status: c.status,
        content: c.content,
        evidenceImages: c.evidenceImages,
        createdAt: c.createdAt,
        resolvedAt: c.resolvedAt,
        adminResponse: c.adminResponse,
        // Dữ liệu người dân rút gọn
        citizen: {
          id: c.citizen.id,
          fullName: c.citizen.fullName,
          phone: c.citizen.phone,
          avatar: c.citizen.avatar,
          trustStats: {
            totalComplaints: c.citizen._count.complaints,
            totalFakeReports: c.citizen._count.reportedFakes,
          },
        },
        // Dữ liệu người thu gom rút gọn
        collector: collector
          ? {
            id: collector.id,
            fullName: collector.user.fullName,
            avatar: collector.user.avatar,
            employeeCode: collector.employeeCode,
            trustScore: collector.trustScore,
            skipCount: collector.skipCount,
          }
          : null,
        // Ngữ cảnh đối soát rút gọn
        context: {
          reportId: report.id,
          address: report.address,
          reportStatus: report.status,
          // Ảnh đối soát
          images: {
            citizen: report.images.map((img) => img.imageUrl),
            collector: report.evidenceImages, // Ảnh lúc collector báo hoàn thành/sự cố
          },
          // Đối soát cân nặng
          weightAction: {
            estimated: report.wasteItems.reduce(
              (sum, item) => sum + Number(item.weightKg),
              0,
            ),
            actual: report.actualWeight || 0,
            diff: report.actualWeight
              ? Number(report.actualWeight) -
              report.wasteItems.reduce(
                (sum, item) => sum + Number(item.weightKg),
                0,
              )
              : 0,
          },
          // Đối soát thời gian
          timing: {
            deadline: report.arrivalDeadline,
            completedAt: report.completedAt,
            isLate:
              report.completedAt && report.arrivalDeadline
                ? report.completedAt > report.arrivalDeadline
                : false,
          },
        },
      };
    });

    return successResponse(
      200,
      {
        data: formattedComplaints,
        meta: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Lấy danh sách khiếu nại thành công',
    );
  }

  async respondToComplaint(complaintId: number, dto: RespondComplaintDto) {
    return this.prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
        include: { citizen: true },
      });

      if (!complaint) {
        return errorResponse(404, 'Không tìm thấy khiếu nại');
      }

      // 1. Cập nhật trạng thái khiếu nại
      const updated = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: dto.status,
          adminResponse: dto.response,
          resolvedAt: new Date(),
        },
      });

      // 2. Xử lý logic nghiệp vụ nếu chấp nhận khiếu nại (PROCESSED)
      if (dto.status === 'PROCESSED') {
        // Tìm thông tin vi phạm (nếu có)
        const fakeLog = await tx.reportFakeLog.findFirst({
          where: { reportId: complaint.reportId },
        });

        // 2. Xác định mức phạt dựa trên cấu hình Database
        const config = await tx.systemConfig.findUnique({ where: { id: 1 } });
        if (!config) {
          throw new Error('System configuration not found');
        }

        let penaltyPoints = config.penaltyDefault;
        if (complaint.type === 'WEIGHT_MISMATCH') penaltyPoints = config.penaltyWeightMismatch;
        if (complaint.type === 'UNAUTHORIZED_FEE') penaltyPoints = config.penaltyUnauthorizedFee;
        if (complaint.type === 'NO_SHOW') penaltyPoints = config.penaltyNoShow;

        // Tìm Collector liên quan (có thể từ FakeLog hoặc từ Assignment)
        let collectorId: number | null = null;
        if (fakeLog) {
          const c = await tx.collector.findUnique({
            where: { userId: fakeLog.reporterId },
          });
          if (c) collectorId = c.id;
        } else {
          const assignment = await tx.reportAssignment.findUnique({
            where: { reportId: complaint.reportId },
          });
          if (assignment?.collectorId) collectorId = assignment.collectorId;
        }

        if (collectorId) {
          await tx.collector.update({
            where: { id: collectorId },
            data: {
              trustScore: { decrement: penaltyPoints },
            },
          });
          this.logger.log(
            `Penalized collector ${collectorId} (-${penaltyPoints} trustScore) due to accepted complaint ${complaintId} (Type: ${complaint.type})`,
          );
        }

        // 3. Bồi thường cho Citizen (Tặng điểm thưởng)
        const COMPENSATION_POINTS = config.citizenCompensation;

        // Cập nhật trực tiếp balance trong bảng User theo yêu cầu
        const updatedUser = await tx.user.update({
          where: { id: complaint.citizenId },
          data: {
            balance: { increment: COMPENSATION_POINTS },
          },
        });

        const typeLabel = this.getComplaintTypeLabel(complaint.type);
        await tx.pointTransaction.create({
          data: {
            userId: complaint.citizenId,
            reportId: complaint.reportId,
            amount: COMPENSATION_POINTS,
            type: 'COMPENSATION' as any, // Sử dụng loại giao dịch mới (ép kiểu vì IDE chưa cập nhật)
            description: `Bồi thường cho khiếu nại #${complaint.id} được chấp nhận (Loại: ${typeLabel})`,
            balanceAfter: updatedUser.balance,
          },
        });

        this.logger.log(
          `Compensated citizen ${complaint.citizenId} with ${COMPENSATION_POINTS} points for accepted complaint ${complaintId}`,
        );

        // 4. Nếu có FakeLog (Citizen bị oan), xóa log đó
        if (fakeLog) {
          await tx.reportFakeLog.delete({
            where: { id: fakeLog.id },
          });
          this.logger.log(
            `Cleared unjustified ReportFakeLog ${fakeLog.id} for citizen ${complaint.citizenId}`,
          );
        }
      }

      // 3. Gửi thông báo cho User (Non-blocking)
      setImmediate(async () => {
        try {
          const title =
            dto.status === 'PROCESSED'
              ? '✅ Khiếu nại đã được tiếp nhận'
              : '❌ Khiếu nại bị từ chối';
          await this.notificationService.createAndNotify({
            userId: complaint.citizenId,
            title,
            content: `Về khiếu nại mã #${complaint.id}: ${dto.response}`,
            type: 'SYSTEM',
            meta: {
              complaintId: complaint.id,
              status: dto.status,
              type: 'COMPLAINT_PROCESSED',
            },
          });
        } catch (err) {
          this.logger.error(
            `Failed to notify citizen ${complaint.citizenId} for complaint ${complaint.id}`,
            err?.message,
          );
        }
      });

      return successResponse(200, updated, 'Phản hồi khiếu nại thành công');
    });
  }
}
