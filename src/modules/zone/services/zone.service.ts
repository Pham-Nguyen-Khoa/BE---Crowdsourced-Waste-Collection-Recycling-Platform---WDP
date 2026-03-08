import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { CreateZoneDto } from '../dtos/create-zone.dto';
import { UpdateZoneDto } from '../dtos/update-zone.dto';
import {
  ZoneCodeDuplicatedException,
  ZoneInUseException,
  ZoneLocationForbiddenException,
  ZoneNotFoundException,
} from '../exceptions/zone.exceptions';
import { Prisma } from '@prisma/client';
import * as turf from '@turf/turf';

@Injectable()
export class ZoneService {
  private readonly logger = new Logger(ZoneService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Zone is operational partition inside district.
   * ServiceArea controls legal boundary at district level only.
   *
   * Validation Rule:
   * A Zone is VALID if there exists at least one ServiceArea record where:
   * - enterpriseId matches
   * - provinceCode matches
   * - districtCode matches
   *
   * wardCode is metadata only and NOT used for validation.
   */
  async validateZoneGeography(
    enterpriseId: number,
    provinceCode: string,
    districtCode: string | null,
  ): Promise<boolean> {
    if (!provinceCode || !districtCode) return false;

    // 1. Prepare flexible matchers (handle both '007' and '7')
    const pPad = provinceCode.toString().padStart(2, '0');
    const pRaw = provinceCode.toString().replace(/^0+/, '') || '0';

    const dPad = districtCode.toString().padStart(3, '0');
    const dRaw = districtCode.toString().replace(/^0+/, '') || '0';

    this.logger.debug(
      `Validating Zone: Ent ${enterpriseId}, Prov ${pPad}/${pRaw}, Dist ${dPad}/${dRaw}`,
    );

    // 2. Match ServiceArea (flexible with padding)
    const areaMatch = await this.prisma.enterpriseServiceArea.findFirst({
      where: {
        enterpriseId,
        provinceCode: { in: [pPad, pRaw] },
        districtCode: { in: [dPad, dRaw] },
      },
    });

    if (!areaMatch) {
      this.logger.warn(
        `No ServiceArea found for Enterprise ${enterpriseId} in Province ${provinceCode} District ${districtCode}`,
      );
    }

    return !!areaMatch;
  }

  async createZone(enterpriseId: number, dto: CreateZoneDto) {
    const normalized = {
      ...dto,
      provinceCode: dto.provinceCode,
      districtCode: dto.districtCode ?? null,
      wardCode: dto.wardCode ?? null,
    };

    this.validateBoundary(normalized.boundary);

    const isAllowed = await this.validateZoneGeography(
      enterpriseId,
      normalized.provinceCode,
      normalized.districtCode,
    );
    if (!isAllowed) throw new ZoneLocationForbiddenException();

    try {
      return await this.prisma.zone.create({
        data: {
          ...normalized,
          enterpriseId,
          isActive: true,
          deletedAt: null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ZoneCodeDuplicatedException();
      }
      this.logger.error(`Error creating zone: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateZone(enterpriseId: number, zoneId: number, dto: UpdateZoneDto) {
    try {
      return await this.prisma.zone.update({
        where: { id: zoneId, enterpriseId },
        data: {
          name: dto.name,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ZoneNotFoundException();
      }
      throw error;
    }
  }

  async deleteZone(enterpriseId: number, zoneId: number) {
    return this.prisma.$transaction(async (tx) => {
      const zone = await tx.zone.findFirst({
        where: { id: zoneId, enterpriseId },
      });

      if (!zone) throw new ZoneNotFoundException();

      const inUseCount = await tx.collector.count({
        where: {
          OR: [{ primaryZoneId: zoneId }, { secondaryZoneId: zoneId }],
          deletedAt: null,
        },
      });

      if (inUseCount > 0) throw new ZoneInUseException();

      return tx.zone.update({
        where: { id: zoneId },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });
    });
  }

  async getZones(enterpriseId: number) {
    return this.prisma.zone.findMany({
      where: { enterpriseId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getZoneDetail(enterpriseId: number, zoneId: number) {
    const zone = await this.prisma.zone.findFirst({
      where: { id: zoneId, enterpriseId, deletedAt: null },
      include: {
        _count: {
          select: {
            primaryCollectors: { where: { deletedAt: null } },
            secondaryCollectors: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!zone) throw new ZoneNotFoundException();
    return zone;
  }

  async revalidateZones(
    enterpriseId: number,
  ): Promise<{ deactivatedZoneIds: number[]; affectedCollectors: number[] }> {
    const zones = await this.prisma.zone.findMany({
      where: { enterpriseId, deletedAt: null, isActive: true },
    });

    const areas = await this.prisma.enterpriseServiceArea.findMany({
      where: { enterpriseId },
    });

    const invalidZoneIds = zones
      .filter((zone) => {
        return !areas.some(
          (area) =>
            area.provinceCode === zone.provinceCode &&
            area.districtCode === zone.districtCode,
        );
      })
      .map((z) => z.id);

    let affectedCollectors: number[] = [];

    if (invalidZoneIds.length > 0) {
      const affected = await this.prisma.collector.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { primaryZoneId: { in: invalidZoneIds } },
            { secondaryZoneId: { in: invalidZoneIds } },
          ],
        },
        select: { id: true },
      });
      affectedCollectors = affected.map((c) => c.id);

      await this.prisma.zone.updateMany({
        where: { id: { in: invalidZoneIds } },
        data: { isActive: false },
      });
      this.logger.log(
        `Inactivated ${invalidZoneIds.length} zones for enterprise ${enterpriseId}. ` +
          `${affectedCollectors.length} collector(s) affected.`,
      );
    }

    return { deactivatedZoneIds: invalidZoneIds, affectedCollectors };
  }

  private validateBoundary(boundary: any): void {
    if (boundary === null || boundary === undefined) return;

    if (boundary.type !== 'Polygon') {
      throw new BadRequestException('boundary.type phải là "Polygon"');
    }

    if (
      !Array.isArray(boundary.coordinates) ||
      boundary.coordinates.length === 0
    ) {
      throw new BadRequestException('boundary.coordinates phải là mảng hợp lệ');
    }

    const ring: any[] = boundary.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new BadRequestException(
        'Polygon ring đầu tiên phải có ít nhất 4 điểm (3 điểm thực + 1 điểm lặp để khép kín)',
      );
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (
      !Array.isArray(first) ||
      !Array.isArray(last) ||
      first[0] !== last[0] ||
      first[1] !== last[1]
    ) {
      throw new BadRequestException(
        'Polygon phải khép kín: tọa độ điểm đầu phải bằng tọa độ điểm cuối',
      );
    }

    for (let i = 0; i < ring.length; i++) {
      const coord = ring[i];
      if (!Array.isArray(coord) || coord.length < 2) {
        throw new BadRequestException(
          `Tọa độ tại vị trí ${i} không hợp lệ — phải là [longitude, latitude]`,
        );
      }
      const [lng, lat] = coord as [number, number];
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new BadRequestException(`Tọa độ tại vị trí ${i} phải là số thực`);
      }
      if (lng < -180 || lng > 180) {
        throw new BadRequestException(
          `Longitude ${lng} tại vị trí ${i} không hợp lệ — phải trong khoảng [-180, 180]`,
        );
      }
      if (lat < -90 || lat > 90) {
        throw new BadRequestException(
          `Latitude ${lat} tại vị trí ${i} không hợp lệ — phải trong khoảng [-90, 90]`,
        );
      }
    }

    try {
      turf.polygon(boundary.coordinates);
    } catch (e: any) {
      throw new BadRequestException(
        `GeoJSON polygon không hợp lệ về mặt hình học: ${e.message}`,
      );
    }
  }
}
