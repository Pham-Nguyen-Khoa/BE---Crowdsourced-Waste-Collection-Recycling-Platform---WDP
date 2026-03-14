import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { CreateComplaintDto } from '../dtos/create-complaint.dto';
import { SupabaseService } from 'src/modules/supabase/services/supabase.service';

import { NotificationService } from 'src/modules/notification/services/notification.service';

@Injectable()
export class ComplaintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly notificationService: NotificationService,
  ) { }
  async createComplaint(citizenId: number, dto: CreateComplaintDto, files?: Express.Multer.File[]) {
    const report = await this.prisma.report.findUnique({
      where: { id: dto.reportId },
      include: { assignment: true },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    if (report.citizenId !== citizenId) {
      throw new ForbiddenException(
        'Bạn không có quyền khiếu nại với báo cáo này',
      );
    }

    // Chỉ cho phép khiếu nại khi báo cáo đã hoàn thành hoặc bị hủy
    const allowedStatuses = ['COMPLETED', 'CANCELLED'];
    if (!allowedStatuses.includes(report.status)) {
      throw new BadRequestException(
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

    return complaint;
  }

  async getMyComplaints(citizenId: number) {
    return await this.prisma.complaint.findMany({
      where: { citizenId },
      include: {
        report: {
          include: {
            assignment: {
              include: {
                collector: {
                  include: {
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
  }
}
