import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { successResponse } from 'src/common/utils/response.util';
import { Prisma } from '@prisma/client';

export enum LeaderboardCategory {
  POINTS = 'POINTS',
  ECO_WARRIORS = 'ECO_WARRIORS',
  WASTE_IMPACT = 'WASTE_IMPACT',
}

export enum LeaderboardTimeframe {
  ALL_TIME = 'ALL_TIME',
  MONTHLY = 'MONTHLY',
  WEEKLY = 'WEEKLY',
}

interface RankingRecord {
  rank: number;
  userId: number;
  fullName: string | undefined;
  avatar: string | null | undefined;
  value: number;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private prisma: PrismaService) {}

  async getLeaderboard(userId: number, query: any) {
    const { category = LeaderboardCategory.POINTS, timeframe = LeaderboardTimeframe.ALL_TIME } = query;

    let leaderboardData: RankingRecord[] = [];
    let myRankInfo: RankingRecord | null = null;

    const dateFilter = this.getDateFilter(timeframe);

    switch (category) {
      case LeaderboardCategory.POINTS:
        leaderboardData = await this.getTopPoints(timeframe, dateFilter);
        break;
      case LeaderboardCategory.ECO_WARRIORS:
        leaderboardData = await this.getEcoWarriors(timeframe, dateFilter);
        break;
      case LeaderboardCategory.WASTE_IMPACT:
        leaderboardData = await this.getWasteImpact(timeframe, dateFilter);
        break;
    }

    myRankInfo = await this.getMyRank(userId, category, timeframe, dateFilter);

    return successResponse(
      200,
      {
        category,
        timeframe,
        topRankings: leaderboardData.slice(0, 10),
        myRank: myRankInfo,
      },
      'Lấy bảng xếp hạng thành công',
    );
  }

  private getDateFilter(timeframe: LeaderboardTimeframe) {
    const now = new Date();
    if (timeframe === LeaderboardTimeframe.WEEKLY) {
      const d = new Date(now);
      const day = d.getDay() || 7;
      if (day !== 1) d.setHours(-24 * (day - 1));
      d.setHours(0, 0, 0, 0);
      return { gte: d };
    }
    if (timeframe === LeaderboardTimeframe.MONTHLY) {
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    }
    return null;
  }

  private async getTopPoints(timeframe: LeaderboardTimeframe, dateFilter: any): Promise<RankingRecord[]> {
    if (timeframe === LeaderboardTimeframe.ALL_TIME) {
      return this.prisma.user.findMany({
        where: { roleId: 1, deletedAt: null },
        select: {
          id: true,
          fullName: true,
          avatar: true,
          balance: true,
        },
        orderBy: { balance: 'desc' },
        take: 50,
      }).then(users => users.map((u, index) => ({
        rank: index + 1,
        userId: u.id,
        fullName: u.fullName,
        avatar: u.avatar,
        value: u.balance,
      })));
    } else {
      const aggregations = await this.prisma.pointTransaction.groupBy({
        by: ['userId'],
        where: {
          type: 'EARN',
          createdAt: dateFilter,
          user: { roleId: 1, deletedAt: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 50,
      });

      const userIds = aggregations.map(a => a.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, avatar: true },
      });

      return aggregations.map((a, index) => {
        const user = users.find(u => u.id === a.userId);
        return {
          rank: index + 1,
          userId: a.userId,
          fullName: user?.fullName,
          avatar: user?.avatar,
          value: a._sum.amount || 0,
        };
      });
    }
  }

  private async getEcoWarriors(timeframe: LeaderboardTimeframe, dateFilter: any): Promise<RankingRecord[]> {
    const where: any = {
      status: 'COMPLETED',
      citizen: { roleId: 1, deletedAt: null },
    };
    if (dateFilter) where.completedAt = dateFilter;

    const aggregations = await this.prisma.report.groupBy({
      by: ['citizenId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    const userIds = aggregations.map(a => a.citizenId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, avatar: true },
    });

    return aggregations.map((a, index) => {
      const user = users.find(u => u.id === a.citizenId);
      return {
        rank: index + 1,
        userId: a.citizenId,
        fullName: user?.fullName,
        avatar: user?.avatar,
        value: a._count.id,
      };
    });
  }

  private async getWasteImpact(timeframe: LeaderboardTimeframe, dateFilter: any): Promise<RankingRecord[]> {
    const where: any = {
      status: 'COMPLETED',
      citizen: { roleId: 1, deletedAt: null },
    };
    if (dateFilter) where.completedAt = dateFilter;

    const aggregations = await this.prisma.report.groupBy({
      by: ['citizenId'],
      where,
      _sum: { actualWeight: true },
      orderBy: { _sum: { actualWeight: 'desc' } },
      take: 50,
    });

    const userIds = aggregations.map(a => a.citizenId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, avatar: true },
    });

    return aggregations.map((a, index) => {
      const user = users.find(u => u.id === a.citizenId);
      return {
        rank: index + 1,
        userId: a.citizenId,
        fullName: user?.fullName,
        avatar: user?.avatar,
        value: Number(a._sum.actualWeight) || 0,
      };
    });
  }

  private async getMyRank(userId: number, category: LeaderboardCategory, timeframe: LeaderboardTimeframe, dateFilter: any): Promise<RankingRecord | null> {
    let myValue = 0;
    let rank = 1;

    try {
      if (category === LeaderboardCategory.POINTS) {
        if (timeframe === LeaderboardTimeframe.ALL_TIME) {
          const user = await this.prisma.user.findUnique({ 
            where: { id: userId }, 
            select: { balance: true } 
          });
          myValue = user?.balance || 0;
          rank = await this.prisma.user.count({ 
            where: { roleId: 1, balance: { gt: myValue }, deletedAt: null } 
          }) + 1;
        } else {
          const agg = await this.prisma.pointTransaction.aggregate({
            where: { userId, type: 'EARN', createdAt: dateFilter },
            _sum: { amount: true }
          });
          myValue = agg._sum.amount || 0;
          
          const higherUsers = await this.prisma.$queryRaw`
            SELECT COUNT(*) as count FROM (
              SELECT "userId", SUM(amount) as total 
              FROM "PointTransaction" 
              WHERE type = 'EARN' AND "createdAt" >= ${dateFilter.gte}
              GROUP BY "userId"
              HAVING SUM(amount) > ${myValue}
            ) as subquery
          `;
          rank = Number((higherUsers as any)[0].count) + 1;
        }
      } else if (category === LeaderboardCategory.ECO_WARRIORS) {
        const citizenId = userId;
        const myCount = await this.prisma.report.count({ 
          where: { citizenId, status: 'COMPLETED', ...(dateFilter && { completedAt: dateFilter }) } 
        });
        myValue = myCount;
        
        const higherUsers = await this.prisma.$queryRaw`
          SELECT COUNT(*) as count FROM (
            SELECT "citizenId", COUNT(*) as total 
            FROM "Report" 
            WHERE status = 'COMPLETED' ${dateFilter ? Prisma.sql`AND "completedAt" >= ${dateFilter.gte}` : Prisma.empty}
            GROUP BY "citizenId"
            HAVING COUNT(*) > ${myValue}
          ) as subquery
        `;
        rank = Number((higherUsers as any)[0].count) + 1;
      } else if (category === LeaderboardCategory.WASTE_IMPACT) {
        const citizenId = userId;
        const agg = await this.prisma.report.aggregate({
          where: { citizenId, status: 'COMPLETED', ...(dateFilter && { completedAt: dateFilter }) },
          _sum: { actualWeight: true }
        });
        myValue = Number(agg._sum.actualWeight) || 0;

        const higherUsers = await this.prisma.$queryRaw`
          SELECT COUNT(*) as count FROM (
            SELECT "citizenId", SUM("actualWeight") as total 
            FROM "Report" 
            WHERE status = 'COMPLETED' ${dateFilter ? Prisma.sql`AND "completedAt" >= ${dateFilter.gte}` : Prisma.empty}
            GROUP BY "citizenId"
            HAVING SUM("actualWeight") > ${myValue}
          ) as subquery
        `;
        rank = Number((higherUsers as any)[0].count) + 1;
      }

      const user = await this.prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { fullName: true, avatar: true } 
      });

      if (!user) return null;

      return {
        rank: Number(rank) || 0,
        userId,
        fullName: user.fullName,
        avatar: user.avatar,
        value: Number(myValue) || 0,
      };
    } catch (error) {
      this.logger.error('Error calculating my rank', error);
      return null;
    }
  }
}
