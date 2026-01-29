import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { errorResponse, successResponse } from "src/common/utils/response.util";
import { EnterpriseMapResponseDto } from "../dtos/enterprise-map-response.dto";

@Injectable()
export class GetEnterprisesMapService {
    private readonly logger = new Logger(GetEnterprisesMapService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getEnterprisesMap(status?: string) {
        try {
            const where: any = {
                deletedAt: null,
            };

            // Filter by status if provided
            if (status && ['ACTIVE', 'PENDING', 'BANNED', 'EXPIRED', 'OFFLINE'].includes(status)) {
                where.status = status;
            }

            const enterprises = await this.prisma.enterprise.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            phone: true,
                        }
                    },
                    _count: {
                        select: { collectors: true }
                    }
                }
            });

            const markers: EnterpriseMapResponseDto[] = enterprises.map(e => ({
                id: e.id,
                name: e.name,
                address: e.address,
                latitude: Number(e.latitude),
                longitude: Number(e.longitude),
                status: e.status,
                capacityKg: Number(e.capacityKg),
                collectorCount: e._count.collectors,
                contactPhone: e.user.phone || undefined,
            }));

            return successResponse(200, {
                total: markers.length,
                markers,
            }, 'Lấy danh sách doanh nghiệp thành công');

        } catch (error) {
            this.logger.error('Error getting enterprises map:', error);
            return errorResponse(500, error.message);
        }
    }

    async getEnterpriseDetailMap(enterpriseId: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { id: enterpriseId, deletedAt: null },
                include: {
                    user: {
                        select: {
                            fullName: true,
                            email: true,
                            phone: true,
                        }
                    },
                    collectors: {
                        where: { deletedAt: null },
                        include: {
                            user: {
                                select: {
                                    fullName: true,
                                    phone: true,
                                    avatar: true,
                                }
                            },
                            status: {
                                select: { status: true }
                            }
                        }
                    },
                    _count: {
                        select: { collectors: true }
                    }
                }
            });

            if (!enterprise) {
                return errorResponse(404, 'Không tìm thấy doanh nghiệp');
            }

            const collectors = enterprise.collectors.map(c => ({
                id: c.id,
                fullName: c.user.fullName,
                phone: c.user.phone,
                avatar: c.user.avatar,
                status: c.status?.status || 'OFFLINE',
            }));

            return successResponse(200, {
                enterprise: {
                    id: enterprise.id,
                    name: enterprise.name,
                    address: enterprise.address,
                    latitude: Number(enterprise.latitude),
                    longitude: Number(enterprise.longitude),
                    status: enterprise.status,
                    capacityKg: Number(enterprise.capacityKg),
                    collectorCount: enterprise._count.collectors,
                    contactEmail: enterprise.user.email,
                    contactPhone: enterprise.user.phone,
                    contactName: enterprise.user.fullName,
                },
                collectors,
            }, 'Lấy thông tin doanh nghiệp thành công');

        } catch (error) {
            this.logger.error('Error getting enterprise detail map:', error);
            return errorResponse(500, error.message);
        }
    }
}

