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
                            avatar: true,
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
                avatar: e.user.avatar || undefined,
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
                            avatar: true,
                        }
                    },
                    serviceAreas: true,
                    wasteTypes: true,
                    subscriptions: {
                        where: { isActive: true },
                        include: { subscriptionPlanConfig: true },
                        orderBy: { endDate: 'desc' },
                        take: 1
                    },
                    collectors: {
                        where: { deletedAt: null },
                        include: {
                            status: {
                                select: { status: true }
                            }
                        }
                    },
                    _count: {
                        select: { 
                            collectors: true,
                            reportAssignments: true
                        }
                    }
                }
            });

            if (!enterprise) {
                return errorResponse(404, 'Không tìm thấy doanh nghiệp');
            }

            // Tính toán stats collector
            const onlineCollectors = enterprise.collectors.filter(c => 
                c.status?.status === 'AVAILABLE' || c.status?.status === 'ON_TASK'
            ).length;
            
            const offlineCollectors = enterprise.collectors.length - onlineCollectors;

            const activeSub = enterprise.subscriptions[0];

            return successResponse(200, {
                enterprise: {
                    id: enterprise.id,
                    name: enterprise.name,
                    avatar: enterprise.user.avatar,
                    address: enterprise.address,
                    latitude: Number(enterprise.latitude),
                    longitude: Number(enterprise.longitude),
                    status: enterprise.status,
                    capacityKg: Number(enterprise.capacityKg),
                    
                    // Thông tin liên hệ
                    contactEmail: enterprise.user.email,
                    contactPhone: enterprise.user.phone,
                    contactName: enterprise.user.fullName,

                    // Hoạt động & Dịch vụ
                    wasteTypes: enterprise.wasteTypes.map(wt => wt.wasteType),
                    serviceAreas: enterprise.serviceAreas.map(sa => ({
                        provinceCode: sa.provinceCode,
                        districtCode: sa.districtCode,
                        wardCode: sa.wardCode
                    })),

                    // Subscription hiện tại
                    activeSubscription: activeSub ? {
                        planName: activeSub.subscriptionPlanConfig.name,
                        startDate: activeSub.startDate,
                        endDate: activeSub.endDate
                    } : null,

                    // Thống kê
                    stats: {
                        totalCollectors: enterprise._count.collectors,
                        onlineCollectors,
                        offlineCollectors,
                        totalReports: enterprise._count.reportAssignments
                    },
                    
                    // Giữ lại collectorCount cho FE cũ nếu cần
                    collectorCount: enterprise._count.collectors,
                },
                // FE đã call và gắn rồi nên giữ lại field nhưng xóa array cho nhẹ (hoặc trả rỗng như user muốn)
                collectors: [], 
            }, 'Lấy thông tin doanh nghiệp chi tiết thành công');

        } catch (error) {
            this.logger.error('Error getting enterprise detail map:', error);
            return errorResponse(500, error.message);
        }
    }
}

