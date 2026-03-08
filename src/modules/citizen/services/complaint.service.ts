import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { CreateComplaintDto } from '../dtos/create-complaint.dto';

@Injectable()
export class ComplaintService {
  constructor(private readonly prisma: PrismaService) {}

  async createComplaint(citizenId: number, dto: CreateComplaintDto) {
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

    // Chỉ cho phép khiếu nại khi báo cáo đã được xử lý (không còn PENDING)
    if (report.status === 'PENDING') {
      throw new BadRequestException(
        'Báo cáo chưa được tiếp nhận, không thể gửi khiếu nại',
      );
    }

    return await (this.prisma as any).complaint.create({
      data: {
        reportId: dto.reportId,
        citizenId: citizenId,
        content: dto.content,
        status: 'OPEN',
      },
    });
  }

  async getMyComplaints(citizenId: number) {
    return await (this.prisma as any).complaint.findMany({
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
