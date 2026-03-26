import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { successResponse } from 'src/common/utils/response.util';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) { }

  // ────────────────────────────────────────────────────────────────────────────
  // OVERVIEW STATS (numbers shown at top of dashboard)
  // ────────────────────────────────────────────────────────────────────────────
  async getOverviewStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalReports,
      reportsToday,
      reportsThisMonth,
      reportsLastMonth,

      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      bannedUsers,

      totalEnterprises,
      activeEnterprises,

      totalCollectors,
      activeCollectors,

      openComplaints,
      totalComplaints,

      totalGiftsRedeemed,
      totalPointsIssued,

      reportsCompleted,
      reportsFailed,
      reportsPending,
    ] = await Promise.all([
      // Reports
      this.prisma.report.count({ where: { deletedAt: null } }),
      this.prisma.report.count({ where: { createdAt: { gte: startOfToday }, deletedAt: null } }),
      this.prisma.report.count({ where: { createdAt: { gte: startOfMonth }, deletedAt: null } }),
      this.prisma.report.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, deletedAt: null },
      }),

      // Users
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth }, deletedAt: null } }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, deletedAt: null },
      }),
      this.prisma.user.count({ where: { status: 'BANNED', deletedAt: null } }),

      // Enterprises
      this.prisma.enterprise.count({ where: { deletedAt: null } }),
      this.prisma.enterprise.count({ where: { status: 'ACTIVE', deletedAt: null } }),

      // Collectors
      this.prisma.collector.count({ where: { deletedAt: null } }),
      this.prisma.collector.count({ where: { isActive: true, deletedAt: null } }),

      // Complaints
      this.prisma.complaint.count({ where: { status: 'OPEN' } }),
      this.prisma.complaint.count(),

      // Gifts / Points
      this.prisma.pointTransaction.count({ where: { type: 'SPEND' } }),
      this.prisma.pointTransaction.aggregate({
        where: { type: 'EARN' },
        _sum: { amount: true },
      }),

      // Report statuses
      this.prisma.report.count({ where: { status: 'COMPLETED', deletedAt: null } }),
      this.prisma.report.count({
        where: {
          status: { in: ['CANCELLED', 'FAILED_NO_RESPONSE', 'FAILED_CITIZEN_NOT_HOME'] },
          deletedAt: null,
        },
      }),
      this.prisma.report.count({ where: { status: 'PENDING', deletedAt: null } }),
    ]);

    const reportGrowthPercent =
      reportsLastMonth > 0
        ? Math.round(((reportsThisMonth - reportsLastMonth) / reportsLastMonth) * 100)
        : null;

    const userGrowthPercent =
      newUsersLastMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : null;

    return successResponse(
      200,
      {
        reports: {
          total: totalReports,
          today: reportsToday,
          thisMonth: reportsThisMonth,
          growthPercent: reportGrowthPercent,
          completed: reportsCompleted,
          cancelled: reportsFailed,
          pending: reportsPending,
          completionRate:
            totalReports > 0 ? Math.round((reportsCompleted / totalReports) * 100) : 0,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          newThisMonth: newUsersThisMonth,
          growthPercent: userGrowthPercent,
        },
        enterprises: {
          total: totalEnterprises,
          active: activeEnterprises,
        },
        collectors: {
          total: totalCollectors,
          active: activeCollectors,
        },
        complaints: {
          total: totalComplaints,
          open: openComplaints,
        },
        loyalty: {
          totalGiftsRedeemed,
          totalPointsIssued: totalPointsIssued._sum.amount ?? 0,
        },
      },
      'Lấy tổng quan dashboard thành công',
    );
  }

  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // REPORT TRENDS (daily counts for the last N days)
  // ────────────────────────────────────────────────────────────────────────────
  async getReportTrends(days: number = 30) {
    const results: { date: string; total: number; completed: number; failed: number }[] = [];
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));

    // Initialize results array with empty counts
    const resultsMap: Record<string, { total: number; completed: number; failed: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = this.toLocalDateString(date);
      resultsMap[dateStr] = { total: 0, completed: 0, failed: 0 };
      results.push({ date: dateStr, total: 0, completed: 0, failed: 0 });
    }

    // Fetch all reports in the range once
    const reports = await this.prisma.report.findMany({
      where: {
        createdAt: { gte: startDate },
        deletedAt: null,
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Group in memory
    const failedStatuses = ['CANCELLED', 'FAILED_NO_RESPONSE', 'FAILED_CITIZEN_NOT_HOME'];
    for (const report of reports) {
      const dateStr = this.toLocalDateString(report.createdAt);
      if (resultsMap[dateStr]) {
        resultsMap[dateStr].total++;
        if (report.status === 'COMPLETED') {
          resultsMap[dateStr].completed++;
        } else if (failedStatuses.includes(report.status)) {
          resultsMap[dateStr].failed++;
        }
      }
    }

    // Update results from map
    for (const res of results) {
      res.total = resultsMap[res.date].total;
      res.completed = resultsMap[res.date].completed;
      res.failed = resultsMap[res.date].failed;
    }

    return successResponse(200, results, 'Lấy xu hướng báo cáo thành công');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NEW USER TRENDS (daily new registrations for the last N days)
  // ────────────────────────────────────────────────────────────────────────────
  async getUserTrends(days: number = 30) {
    const results: {
      date: string;
      newUsers: number;
      citizens: number;
      collectors: number;
      enterprises: number;
    }[] = [];
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));

    // Get role IDs once
    const roles = await this.prisma.role.findMany({ select: { id: true, name: true } });
    const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]));
    const roleIdToName = Object.fromEntries(roles.map((r) => [r.id, r.name]));

    // Initialize results array with empty counts
    const resultsMap: Record<string, { citizens: number; collectors: number; enterprises: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = this.toLocalDateString(date);
      resultsMap[dateStr] = { citizens: 0, collectors: 0, enterprises: 0 };
      results.push({ date: dateStr, newUsers: 0, citizens: 0, collectors: 0, enterprises: 0 });
    }

    // Fetch all users in the range once
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: startDate },
        deletedAt: null,
      },
      select: {
        createdAt: true,
        roleId: true,
      },
    });

    // Group in memory
    for (const user of users) {
      const dateStr = this.toLocalDateString(user.createdAt);
      if (resultsMap[dateStr]) {
        const roleName = roleIdToName[user.roleId];
        if (roleName === 'CITIZEN') resultsMap[dateStr].citizens++;
        else if (roleName === 'COLLECTOR') resultsMap[dateStr].collectors++;
        else if (roleName === 'ENTERPRISE') resultsMap[dateStr].enterprises++;
      }
    }

    // Update results from map
    for (const res of results) {
      const counts = resultsMap[res.date];
      res.citizens = counts.citizens;
      res.collectors = counts.collectors;
      res.enterprises = counts.enterprises;
      res.newUsers = counts.citizens + counts.collectors + counts.enterprises;
    }

    return successResponse(200, results, 'Lấy xu hướng người dùng thành công');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // REPORT STATUS BREAKDOWN (pie chart data)
  // ────────────────────────────────────────────────────────────────────────────
  async getReportStatusBreakdown() {
    const statuses = await this.prisma.report.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = statuses.reduce((sum, s) => sum + s._count.id, 0);

    return successResponse(
      200,
      {
        total,
        breakdown: statuses.map((s) => ({
          status: s.status,
          count: s._count.id,
          percentage: total > 0 ? Math.round((s._count.id / total) * 1000) / 10 : 0,
        })),
      },
      'Lấy phân tích trạng thái báo cáo thành công',
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // WASTE TYPE STATS (which type of waste is most collected)
  // ────────────────────────────────────────────────────────────────────────────
  async getWasteTypeStats() {
    const wasteData = await this.prisma.reportActualWaste.groupBy({
      by: ['wasteType'],
      _count: { id: true },
      _sum: { weightKg: true },
    });

    return successResponse(
      200,
      wasteData.map((w) => ({
        wasteType: w.wasteType,
        reportCount: w._count.id,
        totalWeightKg: w._sum.weightKg ?? 0,
      })),
      'Lấy thống kê loại rác thành công',
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TOP PERFORMING ENTERPRISES
  // ────────────────────────────────────────────────────────────────────────────
  async getTopEnterprises(limit: number = 10) {
    const enterprises = await this.prisma.enterprise.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            reportAssignments: true,
            collectors: true,
          },
        },
        reportAssignments: {
          where: { report: { status: 'COMPLETED' } },
          select: { id: true },
        },
      },
      orderBy: {
        reportAssignments: { _count: 'desc' },
      },
      take: limit,
    });

    return successResponse(
      200,
      enterprises.map((e) => ({
        id: e.id,
        name: e.name,
        status: e.status,
        totalAssignments: e._count.reportAssignments,
        completedAssignments: e.reportAssignments.length,
        collectorsCount: e._count.collectors,
        completionRate:
          e._count.reportAssignments > 0
            ? Math.round((e.reportAssignments.length / e._count.reportAssignments) * 100)
            : 0,
      })),
      'Lấy danh sách doanh nghiệp hàng đầu thành công',
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // REVENUE / PAYMENT STATS
  // ────────────────────────────────────────────────────────────────────────────
  async getRevenueStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalRevenue, monthlyRevenue, yearlyRevenue, byMethod, byPlan] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfYear } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.groupBy({
        by: ['subscriptionPlanConfigId'],
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Fetch plan names
    const planIds = byPlan.map((p) => p.subscriptionPlanConfigId);
    const plans = await this.prisma.subscriptionPlanConfig.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true },
    });
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]));

    return successResponse(
      200,
      {
        totalRevenue: totalRevenue._sum.amount ?? 0,
        totalTransactions: totalRevenue._count.id,
        monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
        monthlyTransactions: monthlyRevenue._count.id,
        yearlyRevenue: yearlyRevenue._sum.amount ?? 0,
        yearlyTransactions: yearlyRevenue._count.id,
        byMethod: byMethod.map((b) => ({
          method: b.method,
          totalAmount: b._sum.amount ?? 0,
          count: b._count.id,
        })),
        byPlan: byPlan.map((b) => ({
          planName: planMap[b.subscriptionPlanConfigId] ?? 'Unknown',
          totalAmount: b._sum.amount ?? 0,
          count: b._count.id,
        })),
      },
      'Lấy thống kê doanh thu thành công',
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // USER MANAGEMENT LIST (with filtering)
  // ────────────────────────────────────────────────────────────────────────────
  async getUsers(query: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, role, status, search } = query;
    const skip = (+page - 1) * +limit;

    const roleFilter = role
      ? { role: { name: role as any } }
      : {};

    const statusFilter = status ? { status: status as any } : {};

    const searchFilter = search
      ? {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }
      : {};

    const where = {
      deletedAt: null,
      ...roleFilter,
      ...statusFilter,
      ...searchFilter,
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatar: true,
          status: true,
          balance: true,
          createdAt: true,
          role: { select: { name: true } },
          _count: {
            select: {
              reports: true,
              complaints: true,
            },
          },
        },
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return successResponse(
      200,
      {
        data: users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          avatar: u.avatar,
          status: u.status,
          balance: u.balance,
          role: u.role.name,
          reportCount: u._count.reports,
          complaintCount: u._count.complaints,
          createdAt: u.createdAt,
        })),
        meta: { total, page: +page, limit: +limit },
      },
      'Lấy danh sách người dùng thành công',
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SYSTEM CONFIG (view & update)
  // ────────────────────────────────────────────────────────────────────────────
  async getSystemConfig() {
    const config = await this.prisma.systemConfig.findFirst();
    return successResponse(200, config, 'Lấy cấu hình hệ thống thành công');
  }

  async updateSystemConfig(data: Partial<{
    citizenBasePoint: number;
    organicMultiplier: number;
    recyclableMultiplier: number;
    hazardousMultiplier: number;
    accuracyMatchMultiplier: number;
    accuracyModerateMultiplier: number;
    accuracyHeavyMultiplier: number;
    collectorMatchTrustScore: number;
    penaltyWeightMismatch: number;
    penaltyUnauthorizedFee: number;
    penaltyNoShow: number;
    penaltyDefault: number;
    citizenCompensation: number;
  }>) {
    const config = await this.prisma.systemConfig.update({
      where: { id: 1 },
      data,
    });
    return successResponse(200, config, 'Cập nhật cấu hình hệ thống thành công');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UNBAN USER
  // ────────────────────────────────────────────────────────────────────────────
  async unbanUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { statusCode: 404, message: 'Không tìm thấy người dùng' };
    }
    if (user.status !== 'BANNED') {
      return { statusCode: 400, message: 'Tài khoản này chưa bị khóa' };
    }
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    return successResponse(200, null, `Đã mở khóa tài khoản ${user.fullName} thành công`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ENTERPRISE MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────
  async getEnterprises(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (+page - 1) * +limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [enterprises, total] = await Promise.all([
      this.prisma.enterprise.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          address: true,
          capacityKg: true,
          createdAt: true,
          user: { select: { fullName: true, email: true, phone: true } },
          _count: { select: { collectors: true, zones: true, reportAssignments: true } },
          subscriptions: {
            where: { isActive: true },
            select: { endDate: true, subscriptionPlanConfig: { select: { name: true } } },
            take: 1,
          },
        },
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.enterprise.count({ where }),
    ]);

    return successResponse(
      200,
      {
        data: enterprises.map((e) => ({
          id: e.id,
          name: e.name,
          status: e.status,
          address: e.address,
          capacityKg: e.capacityKg,
          owner: e.user,
          collectorsCount: e._count.collectors,
          zonesCount: e._count.zones,
          totalAssignments: e._count.reportAssignments,
          activeSubscription: e.subscriptions[0]
            ? {
              planName: e.subscriptions[0].subscriptionPlanConfig.name,
              endDate: e.subscriptions[0].endDate,
            }
            : null,
          createdAt: e.createdAt,
        })),
        meta: { total, page: +page, limit: +limit },
      },
      'Lấy danh sách doanh nghiệp thành công',
    );
  }

  async updateEnterpriseStatus(
    enterpriseId: number,
    status: 'ACTIVE' | 'OFFLINE' | 'BANNED' | 'PENDING' | 'EXPIRED',
  ) {
    const enterprise = await this.prisma.enterprise.findUnique({ where: { id: enterpriseId } });
    if (!enterprise) {
      return { statusCode: 404, message: 'Không tìm thấy doanh nghiệp' };
    }
    const updated = await this.prisma.enterprise.update({
      where: { id: enterpriseId },
      data: { status },
    });
    return successResponse(200, { id: updated.id, status: updated.status }, 'Cập nhật trạng thái doanh nghiệp thành công');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DISPATCH LOGS (system logs for monitoring)
  // ────────────────────────────────────────────────────────────────────────────
  async getDispatchLogs(query: { page?: number; limit?: number; level?: string }) {
    const { page = 1, limit = 50, level } = query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (level) where.level = level;

    const [logs, total] = await Promise.all([
      this.prisma.dispatchLog.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dispatchLog.count({ where }),
    ]);

    return successResponse(
      200,
      { data: logs, meta: { total, page: +page, limit: +limit } },
      'Lấy dispatch logs thành công',
    );
  }
}
