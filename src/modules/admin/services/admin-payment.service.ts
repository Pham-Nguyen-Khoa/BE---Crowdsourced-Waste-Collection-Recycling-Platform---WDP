import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { errorResponse, successResponse } from 'src/common/utils/response.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

  async getPayments(query: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    planId?: number;
    enterpriseId?: number;
    search?: string;
    createdFrom?: string;
    createdTo?: string;
    paidFrom?: string;
    paidTo?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      method,
      planId,
      enterpriseId,
      search,
      createdFrom,
      createdTo,
      paidFrom,
      paidTo,
    } = query;

    const skip = (+page - 1) * +limit;

    const where: Prisma.PaymentWhereInput = {};

    if (status) where.status = status as any;
    if (method) where.method = method as any;
    if (planId) where.subscriptionPlanConfigId = +planId;
    if (enterpriseId) where.enterpriseId = +enterpriseId;

    const createdFromDate = this.parseDate(createdFrom);
    const createdToDate = this.parseDate(createdTo);
    if (createdFromDate || createdToDate) {
      where.createdAt = {};
      if (createdFromDate) where.createdAt.gte = createdFromDate;
      if (createdToDate) where.createdAt.lte = createdToDate;
    }

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
          expiresAt: true,
          enterprise: { select: { id: true, name: true, status: true } },
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          subscriptionPlanConfig: {
            select: { id: true, name: true, price: true, durationMonths: true },
          },
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
          expiresAt: p.expiresAt,
          enterprise: p.enterprise,
          user: p.user,
          plan: p.subscriptionPlanConfig,
        })),
        meta: { total, page: +page, limit: +limit },
        summary: {
          totalAmount: aggregate._sum.amount ?? 0,
          totalTransactions: aggregate._count.id,
        },
      },
      'Lấy danh sách thanh toán thành công',
    );
  }

  async getPaymentById(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        enterprise: { select: { id: true, name: true, status: true, address: true } },
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        subscriptionPlanConfig: {
          select: { id: true, name: true, price: true, durationMonths: true },
        },
      },
    });

    if (!payment) return errorResponse(404, 'Không tìm thấy thông tin thanh toán', 'PAYMENT_NOT_FOUND');

    return successResponse(
      200,
      {
        id: payment.id,
        referenceCode: payment.referenceCode,
        amount: Number(payment.amount),
        currency: payment.currency,
        description: payment.description,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        expiresAt: payment.expiresAt,
        failedAt: payment.failedAt,
        cancelledAt: payment.cancelledAt,
        bankTransactionId: payment.bankTransactionId,
        bankAccountNumber: payment.bankAccountNumber,
        bankName: payment.bankName,
        notes: payment.notes,
        webhookId: payment.webhookId,
        webhookData: payment.webhookData,
        enterprise: payment.enterprise,
        user: payment.user,
        plan: payment.subscriptionPlanConfig,
      },
      'Lấy chi tiết thanh toán thành công',
    );
  }

  async getPaymentByReference(referenceCode: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { referenceCode },
      include: {
        enterprise: { select: { id: true, name: true, status: true, address: true } },
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        subscriptionPlanConfig: {
          select: { id: true, name: true, price: true, durationMonths: true },
        },
      },
    });

    if (!payment) return errorResponse(404, 'Không tìm thấy thông tin thanh toán', 'PAYMENT_NOT_FOUND');

    return successResponse(
      200,
      {
        id: payment.id,
        referenceCode: payment.referenceCode,
        amount: Number(payment.amount),
        currency: payment.currency,
        description: payment.description,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        expiresAt: payment.expiresAt,
        failedAt: payment.failedAt,
        cancelledAt: payment.cancelledAt,
        bankTransactionId: payment.bankTransactionId,
        bankAccountNumber: payment.bankAccountNumber,
        bankName: payment.bankName,
        notes: payment.notes,
        webhookId: payment.webhookId,
        webhookData: payment.webhookData,
        enterprise: payment.enterprise,
        user: payment.user,
        plan: payment.subscriptionPlanConfig,
      },
      'Lấy chi tiết thanh toán thành công',
    );
  }
}
