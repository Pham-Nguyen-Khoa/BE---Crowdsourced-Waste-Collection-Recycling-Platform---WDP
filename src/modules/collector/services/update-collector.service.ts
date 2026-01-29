import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { errorResponse, successResponse } from "src/common/utils/response.util";
import { UpdateCollectorDto } from "../dtos/update-collector.dto";

@Injectable()
export class UpdateCollectorService {
    private readonly logger = new Logger(UpdateCollectorService.name);

    constructor(private readonly prisma: PrismaService) { }

    async updateCollector(userId: number, collectorId: number, dto: UpdateCollectorDto) {
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
                    user: { select: { id: true } },
                    status: { select: { collectorId: true } }
                }
            });

            if (!collector) {
                return errorResponse(404, 'Không tìm thấy collector');
            }

            const result = await this.prisma.$transaction(async (tx) => {
                const updateData: any = {};
                if (dto.fullName) updateData.fullName = dto.fullName;
                if (dto.phone !== undefined) updateData.phone = dto.phone;

                const updatedUser = await (tx as any).user.update({
                    where: { id: collector.userId },
                    data: updateData
                });

                if (dto.status) {
                    await (tx as any).collectorStatus.update({
                        where: { collectorId: collector.id },
                        data: { status: dto.status }
                    });
                }

                return { user: updatedUser, collector };
            });

            return successResponse(200, {
                collectorId: result.collector.id,
                fullName: dto.fullName,
                phone: dto.phone,
                status: dto.status,
            }, 'Cập nhật collector thành công');

        } catch (error) {
            this.logger.error(`Error updating collector:`, error);
            return errorResponse(500, error.message);
        }
    }
}

