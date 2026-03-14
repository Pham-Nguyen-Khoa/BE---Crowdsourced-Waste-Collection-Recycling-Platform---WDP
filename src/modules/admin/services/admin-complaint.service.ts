import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { RespondComplaintDto } from '../dtos/respond-complaint.dto';
import { NotificationService } from '../../notification/services/notification.service';
import { successResponse, errorResponse } from 'src/common/utils/response.util';

@Injectable()
export class AdminComplaintService {
  private readonly logger = new Logger(AdminComplaintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async getAllComplaints(query: any) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [total, complaints] = await Promise.all([
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.findMany({
        where,
        include: {
          citizen: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          report: {
            select: {
              id: true,
              address: true,
              status: true,
            },
          },
        },
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return successResponse(
      200,
      {
        data: complaints,
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
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { citizen: true },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: dto.status,
        adminResponse: dto.response,
        resolvedAt: new Date(),
      },
    });

    // Notify user
    setImmediate(async () => {
      try {
        const title = dto.status === 'PROCESSED' ? '✅ Khiếu nại đã được tiếp nhận' : '❌ Khiếu nại bị từ chối';
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
  }
}
