import { Injectable, Logger } from '@nestjs/common';
import * as turf from '@turf/turf';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface ZoneWithBoundary {
  id: number;
  name: string;
  code: string;
  boundary: any; // GeoJSON Polygon stored in DB
}

export interface GeoFenceResult {
  isInsidePrimaryZone: boolean;
  isInsideSecondaryZone: boolean;
  primaryZoneDistance?: number; // meters from primary zone edge (if outside)
  secondaryZoneDistance?: number;
  warning?: string;
}

export interface ZoneMatchResult {
  zoneId: number | null;
  zoneName: string | null;
  zoneCode: string | null;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  /**
   * 1. VERIFY LOCATION
   * Check if a GPS point is inside a Zone's boundary polygon.
   * Used when a Collector starts their shift (ONLINE).
   */
  isPointInZone(point: GeoPoint, zoneBoundary: any): boolean {
    if (!zoneBoundary) return false; // Zone has no boundary set => lenient, allow

    try {
      const turfPoint = turf.point([point.longitude, point.latitude]);
      const turfPolygon = turf.polygon(zoneBoundary.coordinates);
      return turf.booleanPointInPolygon(turfPoint, turfPolygon);
    } catch (e) {
      this.logger.warn(`[GeoService] isPointInZone error: ${e.message}`);
      return false;
    }
  }

  /**
   * Returns distance in meters from a point to the nearest edge of a polygon.
   * Used for Geo-fencing warnings.
   */
  distanceToZoneEdge(point: GeoPoint, zoneBoundary: any): number {
    if (!zoneBoundary) return 0;

    try {
      const turfPoint = turf.point([point.longitude, point.latitude]);
      const turfPolygon = turf.polygon(zoneBoundary.coordinates);
      // polygonToLine returns a LineString or MultiLineString feature
      const line = turf.polygonToLine(turfPolygon) as any;
      const nearest = turf.nearestPointOnLine(line, turfPoint);
      const dist = turf.distance(turfPoint, nearest, { units: 'meters' });
      return Math.round(dist);
    } catch (e) {
      this.logger.warn(`[GeoService] distanceToZoneEdge error: ${e.message}`);
      return 0;
    }
  }

  /**
   * 2. GEO-FENCING
   * Checks if a Collector's current GPS location is within their assigned zones.
   * Returns a structured result with warnings if outside.
   */
  checkGeoFence(
    point: GeoPoint,
    primaryZone: ZoneWithBoundary | null,
    secondaryZone: ZoneWithBoundary | null,
  ): GeoFenceResult {
    const result: GeoFenceResult = {
      isInsidePrimaryZone: true,
      isInsideSecondaryZone: true,
    };

    // Check primary zone
    if (primaryZone?.boundary) {
      result.isInsidePrimaryZone = this.isPointInZone(
        point,
        primaryZone.boundary,
      );
      if (!result.isInsidePrimaryZone) {
        const dist = this.distanceToZoneEdge(point, primaryZone.boundary);
        result.primaryZoneDistance = dist;
      }
    }

    // Check secondary zone (optional)
    if (secondaryZone?.boundary) {
      result.isInsideSecondaryZone = this.isPointInZone(
        point,
        secondaryZone.boundary,
      );
      if (!result.isInsideSecondaryZone) {
        const dist = this.distanceToZoneEdge(point, secondaryZone.boundary);
        result.secondaryZoneDistance = dist;
      }
    }

    // Build warning message
    if (!result.isInsidePrimaryZone) {
      const distText =
        result.primaryZoneDistance !== undefined
          ? ` (${result.primaryZoneDistance}m ngoài ranh giới)`
          : '';
      result.warning = `⚠️ Nhân viên đang nằm ngoài vùng chính "${primaryZone?.name}"${distText}. Vui lòng di chuyển vào đúng khu vực.`;
    }

    return result;
  }

  /**
   * 3. AUTO-ASSIGNMENT HELPER
   * Given a report's GPS (lat, long), find which Zone it belongs to.
   * Used when a new Report comes in to automatically assign to the right Zone.
   */
  findZoneForReport(
    point: GeoPoint,
    zones: ZoneWithBoundary[],
  ): ZoneMatchResult {
    const turfPoint = turf.point([point.longitude, point.latitude]);

    for (const zone of zones) {
      if (!zone.boundary) continue;
      try {
        const turfPolygon = turf.polygon(zone.boundary.coordinates);
        if (turf.booleanPointInPolygon(turfPoint, turfPolygon)) {
          return {
            zoneId: zone.id,
            zoneName: zone.name,
            zoneCode: zone.code,
          };
        }
      } catch (e) {
        this.logger.warn(
          `[GeoService] findZoneForReport error for zone ${zone.id}: ${e.message}`,
        );
      }
    }

    return { zoneId: null, zoneName: null, zoneCode: null };
  }
}
