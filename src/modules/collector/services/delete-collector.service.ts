import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { errorResponse, successResponse } from "src/common/utils/response.util";

@Injectable()
export class DeleteCollectorService {
    private readonly logger = new Logger(DeleteCollectorService.name);

    constructor(private readonly prisma: PrismaService) { }

    async deleteCollector(userId: number, collectorId: number) {
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
                    user: { select: { id: true, fullName: true, email: true } },
                    reportAssignments: {
                        where: { completedAt: null }
                    }
                }
            });

            if (!collector) {
                return errorResponse(404, 'Không tìm thấy collector');
            }

            if (collector.reportAssignments.length > 0) {
                return errorResponse(400, 'Không thể xóa collector đang có đơn chưa hoàn thành');
            }

            await this.prisma.$transaction(async (tx) => {
                await (tx as any).collector.update({
                    where: { id: collectorId },
                    data: { deletedAt: new Date() }
                });

                await (tx as any).user.update({
                    where: { id: collector.userId },
                    data: { deletedAt: new Date(), status: 'DELETED' }
                });
            });


            return successResponse(200, {
                collectorId: collector.id,
                fullName: collector.user.fullName,
                email: collector.user.email,
            }, 'Xóa collector thành công');

        } catch (error) {
            this.logger.error(`Error deleting collector:`, error);
            return errorResponse(500, error.message);
        }
    }
}

