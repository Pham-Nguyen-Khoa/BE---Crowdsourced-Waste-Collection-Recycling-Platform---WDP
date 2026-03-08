import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { errorResponse, successResponse } from 'src/common/utils/response.util';
import { UpdateCollectorDto } from '../dtos/update-collector.dto';

@Injectable()
export class UpdateCollectorService {
  private readonly logger = new Logger(UpdateCollectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async updateCollector(
    userId: number,
    collectorId: number,
    dto: UpdateCollectorDto,
  ) {
    try {
      const enterprise = await this.prisma.enterprise.findFirst({
        where: { userId, deletedAt: null },
        select: { id: true, name: true },
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
          status: { select: { collectorId: true } },
        },
      });

      if (!collector) {
        return errorResponse(404, 'Không tìm thấy collector');
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Geography Validation if zones are being updated
        if (dto.primaryZoneId || dto.secondaryZoneId) {
          const zoneIds: number[] = [];
          if (dto.primaryZoneId) zoneIds.push(dto.primaryZoneId);
          if (dto.secondaryZoneId) zoneIds.push(dto.secondaryZoneId);

          const zones = await tx.zone.findMany({
            where: {
              id: { in: zoneIds },
              enterpriseId: enterprise.id,
              deletedAt: null,
              isActive: true,
            },
          });

          if (
            dto.primaryZoneId &&
            !zones.find((z) => z.id === dto.primaryZoneId)
          ) {
            throw new Error(
              `Primary zone ${dto.primaryZoneId} is invalid or belongs to another enterprise`,
            );
          }
          if (
            dto.secondaryZoneId &&
            !zones.find((z) => z.id === dto.secondaryZoneId)
          ) {
            throw new Error(
              `Secondary zone ${dto.secondaryZoneId} is invalid or belongs to another enterprise`,
            );
          }
        }

        const userUpdateData: any = {};
        if (dto.fullName) userUpdateData.fullName = dto.fullName;
        if (dto.phone !== undefined) userUpdateData.phone = dto.phone;

        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: collector.userId },
            data: userUpdateData,
          });
        }

        const collectorUpdateData: any = {};
        if (dto.primaryZoneId)
          collectorUpdateData.primaryZoneId = dto.primaryZoneId;
        if (dto.secondaryZoneId !== undefined)
          collectorUpdateData.secondaryZoneId = dto.secondaryZoneId;

        if (Object.keys(collectorUpdateData).length > 0) {
          await tx.collector.update({
            where: { id: collector.id },
            data: collectorUpdateData,
          });
        }

        if (dto.status) {
          await (tx as any).collectorStatus.update({
            where: { collectorId: collector.id },
            data: { availability: dto.status },
          });
        }

        return { collector };
      });

      return successResponse(
        200,
        {
          collectorId: result.collector.id,
          fullName: dto.fullName,
          phone: dto.phone,
          status: dto.status,
        },
        'Cập nhật collector thành công',
      );
    } catch (error) {
      this.logger.error(`Error updating collector:`, error);
      return errorResponse(500, error.message);
    }
  }
}
