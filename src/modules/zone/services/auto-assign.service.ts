import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { GeoService, GeoPoint } from './geo.service';
import { CollectorAvailability } from '@prisma/client';

export interface AutoAssignResult {
  found: boolean;
  collectorId?: number;
  collectorEmployeeCode?: string;
  collectorName?: string;
  zoneId?: number;
  zoneCode?: string;
  zoneName?: string;
  reason?: string; // Why no collector found
}

@Injectable()
export class AutoAssignService {
  private readonly logger = new Logger(AutoAssignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
  ) {}

  /**
   * AUTO-ASSIGNMENT
   *
   * Given a report's GPS location and enterprise, automatically:
   * 1. Find which Zone the report falls into (via GeoJSON boundary)
   * 2. Find all Collectors currently ONLINE_AVAILABLE in that Zone
   * 3. Return the best candidate (lowest load / trust score priority)
   */
  async findBestCollectorForReport(params: {
    enterpriseId: number;
    reportLatitude: number;
    reportLongitude: number;
    reportDistrictCode?: string;
  }): Promise<AutoAssignResult> {
    const { enterpriseId, reportLatitude, reportLongitude } = params;
    const reportPoint: GeoPoint = {
      latitude: reportLatitude,
      longitude: reportLongitude,
    };

    try {
      // ─────────────────────────────────────────────────────────────
      // Step 1: Load all active Zones with boundaries for this Enterprise
      // ─────────────────────────────────────────────────────────────
      const zones = (await this.prisma.zone.findMany({
        where: { enterpriseId, isActive: true, deletedAt: null },
      })) as any[];

      if (zones.length === 0) {
        return {
          found: false,
          reason: 'Doanh nghiệp chưa có Zone nào đang hoạt động',
        };
      }

      // Only Zones that have boundary configured
      const zonesWithBoundary = zones.filter((z: any) => z.boundary);

      if (zonesWithBoundary.length === 0) {
        // Fallback: district-level zone matching when no zone has a boundary polygon
        const { reportDistrictCode, enterpriseId: entId } = params;

        if (!reportDistrictCode) {
          return {
            found: false,
            reason:
              'Chưa có Zone nào có ranh giới (boundary) và không có districtCode để fallback',
          };
        }

        const districtZones = await this.prisma.zone.findMany({
          where: {
            enterpriseId: entId,
            districtCode: reportDistrictCode,
            isActive: true,
            deletedAt: null,
          },
        });

        if (districtZones.length === 0) {
          return {
            found: false,
            reason: `Không có Zone nào trong district ${reportDistrictCode} của doanh nghiệp`,
          };
        }

        if (districtZones.length > 1) {
          return {
            found: false,
            reason: `District ${reportDistrictCode} có ${districtZones.length} zone nhưng chưa có ranh giới — cần cấu hình polygon hoặc assign thủ công`,
          };
        }

        // Exactly 1 zone in this district — use it as the logical dispatch target
        const fallbackZone = districtZones[0];
        this.logger.log(
          `[AutoAssign] Fallback → district zone ${fallbackZone.code} [id=${fallbackZone.id}]`,
        );

        const fallbackCollectors = await this.prisma.collector.findMany({
          where: {
            enterpriseId: entId,
            isActive: true,
            deletedAt: null,
            OR: [
              { primaryZoneId: fallbackZone.id },
              { secondaryZoneId: fallbackZone.id },
            ],
            status: {
              availability: CollectorAvailability.ONLINE_AVAILABLE,
              queueLength: { lt: 6 },
            },
          },
          select: {
            id: true,
            employeeCode: true,
            primaryZoneId: true,
            trustScore: true,
            user: { select: { fullName: true } },
            status: {
              select: {
                availability: true,
                currentLatitude: true,
                currentLongitude: true,
                queueLength: true,
              },
            },
          },
        });

        if (fallbackCollectors.length === 0) {
          return {
            found: false,
            zoneId: fallbackZone.id,
            zoneCode: fallbackZone.code,
            zoneName: fallbackZone.name,
            reason: `Không có nhân viên nào đang ONLINE tại Zone "${fallbackZone.name}"`,
          };
        }

        const bestFallback = fallbackCollectors.sort((a, b) => {
          const aP = a.primaryZoneId === fallbackZone.id ? 1 : 0;
          const bP = b.primaryZoneId === fallbackZone.id ? 1 : 0;
          if (bP !== aP) return bP - aP;
          const aQL = a.status?.queueLength || 0;
          const bQL = b.status?.queueLength || 0;
          if (aQL !== bQL) {
            return aQL - bQL;
          }
          return b.trustScore - a.trustScore;
        })[0];

        this.logger.log(
          `[AutoAssign] Fallback collector: ${bestFallback.employeeCode} (TrustScore: ${bestFallback.trustScore})`,
        );

        return {
          found: true,
          collectorId: bestFallback.id,
          collectorEmployeeCode: bestFallback.employeeCode,
          collectorName: bestFallback.user.fullName,
          zoneId: fallbackZone.id,
          zoneCode: fallbackZone.code,
          zoneName: fallbackZone.name,
        };
      }

      // ─────────────────────────────────────────────────────────────
      // Step 2: Find which Zone the report point falls into
      // ─────────────────────────────────────────────────────────────
      const matchedZone = this.geoService.findZoneForReport(
        reportPoint,
        zonesWithBoundary as any,
      );

      if (!matchedZone.zoneId) {
        return {
          found: false,
          reason:
            'Vị trí túi rác không nằm trong bất kỳ Zone nào đã được cấu hình',
        };
      }

      this.logger.log(
        `[AutoAssign] Report at (${reportLatitude},${reportLongitude}) → Zone ${matchedZone.zoneCode} [id=${matchedZone.zoneId}]`,
      );

      // ─────────────────────────────────────────────────────────────
      // Step 3: Find ONLINE_AVAILABLE collectors in that zone
      // Priority: primaryZone collectors first, then secondaryZone
      // Tie-break: highest trustScore first
      // ─────────────────────────────────────────────────────────────
      const availableCollectors = await this.prisma.collector.findMany({
        where: {
          enterpriseId,
          isActive: true,
          deletedAt: null,
          OR: [
            { primaryZoneId: matchedZone.zoneId },
            { secondaryZoneId: matchedZone.zoneId },
          ],
          status: {
            availability: CollectorAvailability.ONLINE_AVAILABLE,
            queueLength: { lt: 6 },
          },
        },
        select: {
          id: true,
          employeeCode: true,
          primaryZoneId: true,
          trustScore: true,
          user: { select: { fullName: true } },
          status: {
            select: {
              availability: true,
              currentLatitude: true,
              currentLongitude: true,
              queueLength: true,
            },
          },
        },
        // We will sort manually below, but we can pre-sort by queueLength and trustScore
        orderBy: [{ status: { queueLength: 'asc' } }, { trustScore: 'desc' }],
      });

      if (availableCollectors.length === 0) {
        return {
          found: false,
          zoneId: matchedZone.zoneId,
          zoneCode: matchedZone.zoneCode!,
          zoneName: matchedZone.zoneName!,
          reason: `Không có nhân viên nào đang ONLINE tại Zone "${matchedZone.zoneName}"`,
        };
      }

      // Prefer primary zone collectors over secondary
      const primaryFirst = availableCollectors.sort((a, b) => {
        const aIsPrimary = a.primaryZoneId === matchedZone.zoneId ? 1 : 0;
        const bIsPrimary = b.primaryZoneId === matchedZone.zoneId ? 1 : 0;
        if (bIsPrimary !== aIsPrimary) return bIsPrimary - aIsPrimary;
        const aQL = a.status?.queueLength || 0;
        const bQL = b.status?.queueLength || 0;
        if (aQL !== bQL) {
          return aQL - bQL;
        }
        return b.trustScore - a.trustScore; // higher trust wins
      });

      const bestCollector = primaryFirst[0];

      this.logger.log(
        `[AutoAssign] Best collector: ${bestCollector.employeeCode} (TrustScore: ${bestCollector.trustScore})`,
      );

      return {
        found: true,
        collectorId: bestCollector.id,
        collectorEmployeeCode: bestCollector.employeeCode,
        collectorName: bestCollector.user.fullName,
        zoneId: matchedZone.zoneId,
        zoneCode: matchedZone.zoneCode!,
        zoneName: matchedZone.zoneName!,
      };
    } catch (error) {
      this.logger.error(`[AutoAssign] Error: ${error.message}`, error.stack);
      return { found: false, reason: `Lỗi hệ thống: ${error.message}` };
    }
  }
}
