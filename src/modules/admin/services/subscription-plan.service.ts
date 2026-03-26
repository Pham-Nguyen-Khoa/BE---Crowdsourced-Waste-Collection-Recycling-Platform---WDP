import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { CreateSubscriptionPlanDto } from '../dtos/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from '../dtos/update-subscription-plan.dto';
import { successResponse, errorResponse } from 'src/common/utils/response.util';

@Injectable()
export class SubscriptionPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      return errorResponse(400, 'Tên gói subscription đã tồn tại');
    }

    const plan = await this.prisma.subscriptionPlanConfig.create({
      data: {
        ...dto,
      },
    });

    return successResponse(201, plan, 'Tạo gói subscription thành công');
  }

  async findAll() {
    const plans = await this.prisma.subscriptionPlanConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(200, plans, 'Lấy danh sách gói subscription thành công');
  }

  async findOne(id: number) {
    const plan = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { id },
    });

    if (!plan) {
      return errorResponse(404, 'Không tìm thấy gói subscription');
    }

    return successResponse(200, plan, 'Lấy chi tiết gói subscription thành công');
  }

  async update(id: number, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { id },
    });

    if (!plan) {
      return errorResponse(404, 'Không tìm thấy gói subscription');
    }

    if (dto.name && dto.name !== plan.name) {
      const existing = await this.prisma.subscriptionPlanConfig.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        return errorResponse(400, 'Tên gói subscription đã tồn tại');
      }
    }

    const updated = await this.prisma.subscriptionPlanConfig.update({
      where: { id },
      data: dto,
    });

    return successResponse(200, updated, 'Cập nhật gói subscription thành công');
  }

  async remove(id: number) {
    const plan = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    if (!plan) {
      return errorResponse(404, 'Không tìm thấy gói subscription');
    }

    // Nếu đã có doanh nghiệp đăng ký, chỉ cho phép deactivate để tránh lỗi tham chiếu
    if (plan._count.subscriptions > 0) {
      await this.prisma.subscriptionPlanConfig.update({
        where: { id },
        data: { isActive: false },
      });
      return successResponse(200, null, 'Gói đã có dữ liệu đăng ký, đã chuyển sang trạng thái ngưng hoạt động thay vì xóa');
    }

    await this.prisma.subscriptionPlanConfig.delete({
      where: { id },
    });

    return successResponse(200, null, 'Xóa gói subscription thành công');
  }
}
