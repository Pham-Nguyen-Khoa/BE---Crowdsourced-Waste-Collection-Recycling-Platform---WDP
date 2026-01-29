import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { errorResponse, successResponse } from "src/common/utils/response.util";
import { GetCollectorsQueryDto, CollectorAvailabilityFilter } from "../dtos/get-collectors-query.dto";

@Injectable()
export class GetAllCollectorService {
    private readonly logger = new Logger(GetAllCollectorService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getAllCollectors(userId: number, query: GetCollectorsQueryDto) {
        try {
            // 1. Validate enterprise exists
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null },
                select: { id: true, name: true, status: true }
            });

            if (!enterprise) {
                return errorResponse(400, 'Không tìm thấy doanh nghiệp');
            }


            // 2. Parse pagination
            const page = Math.max(1, query.page || 1);
            const limit = Math.min(100, Math.max(1, query.limit || 10));
            const skip = (page - 1) * limit;

            const where: any = {
                enterpriseId: enterprise.id,
                deletedAt: null,
            };

            if (query.status) {
                where.status = { status: query.status };
            }

            if (query.search) {
                where.user = {
                    OR: [
                        { fullName: { contains: query.search, mode: 'insensitive' } },
                        { email: { contains: query.search, mode: 'insensitive' } },
                    ]
                };
            }

            // 4. Query with pagination
            const [collectors, totalItems] = await Promise.all([
                this.prisma.collector.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                fullName: true,
                                email: true,
                                phone: true,
                                avatar: true,
                            }
                        },
                        status: {
                            select: { status: true }
                        }
                    }
                }),
                this.prisma.collector.count({ where })
            ]);

            // 5. Transform data
            const items = collectors.map(c => ({
                id: c.id,
                fullName: c.user.fullName,
                email: c.user.email,
                phone: c.user.phone,
                avatar: c.user.avatar,
                status: c.status?.status || 'OFFLINE',
                createdAt: c.createdAt,
            }));

            // 6. Pagination metadata
            const totalPages = Math.ceil(totalItems / limit);

            return successResponse(200, {
                items,
                meta: {
                    totalItems,
                    currentPage: page,
                    totalPages,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }, 'Lấy danh sách collector thành công');

        } catch (error) {
            this.logger.error(`Error getting collectors for user ${userId}:`, error);
            return errorResponse(500, 'Lỗi khi lấy danh sách collector', error.message);
        }
    }
}

