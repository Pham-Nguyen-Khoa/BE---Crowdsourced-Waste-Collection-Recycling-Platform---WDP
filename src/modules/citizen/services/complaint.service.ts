import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { CreateComplaintDto } from '../dtos/create-complaint.dto';
import { SupabaseService } from 'src/modules/supabase/services/supabase.service';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import {
  successResponse,
  errorResponse,
} from 'src/common/utils/response.util';

@Injectable()
export class ComplaintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly notificationService: NotificationService,
  ) {}

  async createComplaint(
    citizenId: number,
    dto: CreateComplaintDto,
    files?: Express.Multer.File[],
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: dto.reportId },
      include: { assignment: true },
    });

    if (!report) {
      return errorResponse(400, 'Không tìm thấy báo cáo');
    }

    if (report.citizenId !== citizenId) {
      return errorResponse(400, 'Bạn không có quyền khiếu nại với báo cáo này');
    }

    // Chỉ cho phép khiếu nại khi báo cáo đã hoàn thành hoặc bị hủy
    const allowedStatuses = ['COMPLETED', 'CANCELLED'];
    if (!allowedStatuses.includes(report.status)) {
      return errorResponse(
        400,
        'Chỉ có thể khiếu nại sau khi đơn hàng đã hoàn tất hoặc bị hủy',
      );
    }

    let uploadedImageUrls: string[] = [];
    if (files && files.length > 0) {
      uploadedImageUrls = await this.supabaseService.uploadImages(
        files,
        'complaints',
      );
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        reportId: dto.reportId,
        citizenId: citizenId,
        type: dto.type,
        content: dto.content,
        evidenceImages: uploadedImageUrls,
        status: 'OPEN',
      },
      include: {
        citizen: {
          select: { fullName: true },
        },
      },
    });

    // Notify Admins
    setImmediate(async () => {
      try {
        const admins = await this.prisma.user.findMany({
          where: { roleId: 4, deletedAt: null },
          select: { id: true },
        });

        for (const admin of admins) {
          await this.notificationService.createAndNotify({
            userId: admin.id,
            title: '📣 Có khiếu nại mới từ Citizen',
            content: `Citizen ${complaint.citizen.fullName} vừa gửi một khiếu nại mới (Mã đơn: #${complaint.reportId})`,
            type: 'SYSTEM',
            meta: {
              complaintId: complaint.id,
              reportId: complaint.reportId,
              type: 'NEW_COMPLAINT',
            },
          });
        }
      } catch (err) {
        console.error('Failed to notify admins about new complaint:', err);
      }
    });

    return successResponse(200, complaint, 'Gửi khiếu nại thành công');
  }

  // Hàm helper để map ComplaintType sang Tiếng Việt
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

  async getMyComplaints(citizenId: number) {
    const complaints = await this.prisma.complaint.findMany({
      where: { citizenId },
      select: {
        id: true,
        reportId: true,
        content: true,
        type: true,
        status: true,
        evidenceImages: true,
        adminResponse: true,
        createdAt: true,
        resolvedAt: true,
        report: {
          select: {
            address: true,
            status: true,
            assignment: {
              select: {
                collector: {
                  select: {
                    user: {
                      select: {
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedComplaints = complaints.map((c) => ({
      id: c.id,
      reportId: c.reportId,
      content: c.content,
      type: c.type,
      typeLabel: this.getComplaintTypeLabel(c.type),
      status: c.status,
      evidenceImages: c.evidenceImages,
      adminResponse: c.adminResponse,
      createdAt: c.createdAt,
      resolvedAt: c.resolvedAt,
      reportInfo: {
        address: c.report.address,
        reportStatus: c.report.status,
        collectorName: c.report.assignment?.collector?.user?.fullName || 'Chưa phân công',
      },
    }));

    return successResponse(200, formattedComplaints, 'Lấy danh sách khiếu nại thành công');
  }
}
