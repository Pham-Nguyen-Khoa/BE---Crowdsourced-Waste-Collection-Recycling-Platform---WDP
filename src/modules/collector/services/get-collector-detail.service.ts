import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { errorResponse, successResponse } from "src/common/utils/response.util";

@Injectable()
export class GetCollectorDetailService {
    private readonly logger = new Logger(GetCollectorDetailService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getCollectorDetail(userId: number, collectorId: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null },
                select: { id: true, name: true }
            });

            if (!enterprise) {
                return errorResponse(400, 'Không tìm thấy doanh nghiệp');
            }

            const collector = await this.prisma.collector.findFirst({
                where: {
                    id: collectorId,
                    enterpriseId: enterprise.id,
                    deletedAt: null,
                },
                include: {
                    user: {
                        select: {
                            fullName: true,
                            email: true,
                            phone: true,
                            avatar: true,
                            createdAt: true,
                        }
                    },
                    status: {
                        select: { status: true, updatedAt: true }
                    }
                }
            });

            if (!collector) {
                return errorResponse(400, 'Không tìm thấy collector');
            }

            const [totalAssignments, completedAssignments, pendingAssignments] = await Promise.all([
                this.prisma.reportAssignment.count({
                    where: { collectorId: collector.id }
                }),
                this.prisma.reportAssignment.count({
                    where: {
                        collectorId: collector.id,
                        completedAt: { not: null }
                    }
                }),
                this.prisma.reportAssignment.count({
                    where: {
                        collectorId: collector.id,
                        completedAt: null
                    }
                })
            ]);

            return successResponse(200, {
                id: collector.id,
                fullName: collector.user.fullName,
                email: collector.user.email,
                phone: collector.user.phone,
                avatar: collector.user.avatar,
                status: collector.status?.status || 'OFFLINE',
                statusUpdatedAt: collector.status?.updatedAt,
                createdAt: collector.user.createdAt,
                enterpriseName: enterprise.name,
                statistics: {
                    totalAssignments,
                    completedAssignments,
                    pendingAssignments,
                }
            }, 'Lấy thông tin collector thành công');

        } catch (error) {
            this.logger.error(`Error getting collector detail:`, error);
            return errorResponse(500, error.message);
        }
    }
}

