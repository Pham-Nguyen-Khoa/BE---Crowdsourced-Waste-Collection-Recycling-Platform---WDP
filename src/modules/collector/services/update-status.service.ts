import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { successResponse, errorResponse } from 'src/common/utils/response.util';
import { UpdateStatusDto } from '../dtos/update-status.dto';
import { CollectorAvailability } from '@prisma/client';
import { GeoService } from 'src/modules/zone/services/geo.service';

@Injectable()
export class UpdateCollectorStatusService {
  private readonly logger = new Logger(UpdateCollectorStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
  ) { }

  async updateStatus(collectorId: number, dto: UpdateStatusDto) {
    try {
      // 1. Fetch Collector with workingHours
      const collector = await this.prisma.collector.findUnique({
        where: { id: collectorId },
        select: {
          id: true,
          employeeCode: true,
          workingHours: true,
          user: { select: { fullName: true, status: true, deletedAt: true } },
        },
      });

      if (!collector) {
        return errorResponse(400, 'Collector not found');
      }

      if (collector.user.status !== 'ACTIVE' || collector.user.deletedAt) {
        return errorResponse(400, 'Tài khoản của bạn đã bị khóa hoặc xóa. Không thể thay đổi trạng thái.');
      }

      // 2. Check Working Hours when going ONLINE
      if (dto.availability === CollectorAvailability.ONLINE_AVAILABLE) {
        if (!this.isWithinWorkingHours(collector.workingHours)) {
          return errorResponse(
            400,
            'Ngoài khung giờ làm việc, không thể bật trạng thái hoạt động.',
          );
        }
      }

      // 3. GPS is mandatory when going ONLINE
      if (dto.availability !== CollectorAvailability.OFFLINE) {
        if (dto.latitude === undefined || dto.longitude === undefined) {
          return errorResponse(
            400,
            'GPS coordinates (latitude, longitude) are required when starting a shift',
          );
        }
      }

      // 4. Build DB Update Payload
      const now = new Date();

      const currentStatus = await this.prisma.collectorStatus.findUnique({
        where: { collectorId },
        select: { queueLength: true },
      });

      let targetAvailability = dto.availability;
      if (
        dto.availability === CollectorAvailability.ONLINE_AVAILABLE &&
        (currentStatus?.queueLength ?? 0) >= 1
      ) {
        targetAvailability = CollectorAvailability.ONLINE_BUSY;
      }

      const updateData: any = {
        availability: targetAvailability,
        currentLatitude: dto.latitude ?? null,
        currentLongitude: dto.longitude ?? null,
        lastActivityAt: now,
      };

      if (dto.deviceId) updateData.deviceId = dto.deviceId;

      if (dto.availability === CollectorAvailability.OFFLINE) {
        updateData.lastOfflineAt = now;
        updateData.currentLatitude = null;
        updateData.currentLongitude = null;
      } else {
        updateData.lastOnlineAt = now;
        updateData.consecutiveSkipCount = 0;
      }

      const result = await this.prisma.collectorStatus.update({
        where: { collectorId },
        data: updateData,
      });

      this.logger.log(
        `[ShiftAudit] Collector ${collector.employeeCode} (${collector.user.fullName}) → ${dto.availability}`,
      );

      return successResponse(
        200,
        {
          collectorId,
          employeeCode: collector.employeeCode,
          status: result.availability,
          lastUpdated: result.updatedAt,
          location:
            dto.availability !== CollectorAvailability.OFFLINE
              ? { lat: result.currentLatitude, lng: result.currentLongitude }
              : null,
        },
        `Bật trạng thái làm việc thành công`,
      );
    } catch (error) {
      this.logger.error(
        `[UpdateStatus] Error for collector ${collectorId}:`,
        error,
      );
      return errorResponse(
        400,
        error.message,

      );
    }
  }

  private isWithinWorkingHours(workingHours: any): boolean {
    if (!workingHours) return true; // Default to always available if no config

    const now = new Date();
    // Adjust to Vietnam time (GMT+7) if the system is not already
    // The instructions say "current local time is: 2026-03-08T23:33:35+07:00"
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const currentDay = days[now.getDay()];
    const config = workingHours[currentDay];

    if (!config || !config.active) return false;

    const [startH, startM] = config.start.split(':').map(Number);
    const [endH, endM] = config.end.split(':').map(Number);

    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = currentH * 60 + currentM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}
