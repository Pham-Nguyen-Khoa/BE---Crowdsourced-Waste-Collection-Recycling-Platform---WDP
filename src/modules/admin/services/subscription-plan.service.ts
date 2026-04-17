import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { CreateSubscriptionPlanDto } from '../dtos/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from '../dtos/update-subscription-plan.dto';
import { successResponse, errorResponse } from 'src/common/utils/response.util';

@Injectable()
export class SubscriptionPlanService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

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

  async getPaymentsByPlan(
    planId: number,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      paidFrom?: string;
      paidTo?: string;
      search?: string;
    },
  ) {
    const plan = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { id: planId },
      select: { id: true, name: true, price: true, durationMonths: true },
    });

    if (!plan) return errorResponse(404, 'Không tìm thấy gói subscription');

    const { page = 1, limit = 20, status = 'PAID', paidFrom, paidTo, search } = query;
    const skip = (+page - 1) * +limit;

    const where: any = {
      subscriptionPlanConfigId: planId,
    };

    if (status) where.status = status;

    const paidFromDate = this.parseDate(paidFrom);
    const paidToDate = this.parseDate(paidTo);
    if (paidFromDate || paidToDate) {
      where.paidAt = {};
      if (paidFromDate) where.paidAt.gte = paidFromDate;
      if (paidToDate) where.paidAt.lte = paidToDate;
    }

    if (search) {
      where.OR = [
        { referenceCode: { contains: search, mode: 'insensitive' } },
        { enterprise: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total, aggregate] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        select: {
          id: true,
          referenceCode: true,
          amount: true,
          currency: true,
          description: true,
          method: true,
          status: true,
          createdAt: true,
          paidAt: true,
          enterprise: { select: { id: true, name: true, status: true } },
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: +limit,
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return successResponse(
      200,
      {
        plan,
        data: payments.map((p) => ({
          id: p.id,
          referenceCode: p.referenceCode,
          amount: Number(p.amount),
          currency: p.currency,
          description: p.description,
          method: p.method,
          status: p.status,
          createdAt: p.createdAt,
          paidAt: p.paidAt,
          enterprise: p.enterprise,
          user: p.user,
        })),
        meta: { total, page: +page, limit: +limit },
        summary: {
          totalAmount: aggregate._sum.amount ?? 0,
          totalTransactions: aggregate._count.id,
        },
      },
      'Lấy danh sách thanh toán theo gói thành công',
    );
  }
}
