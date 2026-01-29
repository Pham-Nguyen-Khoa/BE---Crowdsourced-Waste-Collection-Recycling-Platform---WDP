import { Injectable, Logger } from "@nestjs/common";
import { successResponse, errorResponse } from "src/common/utils/response.util";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { GetReportsQueryDto, GetReportsResponseDto } from "../dtos/get-reports-query.dto";

@Injectable()
export class GetAllReportService {
    private readonly logger = new Logger(GetAllReportService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getAllReport(userId: number, query: GetReportsQueryDto) {
        try {
            // 1. Kiểm tra citizen tồn tại
            const citizen = await this.prisma.user.findFirst({
                where: { id: userId, deletedAt: null },
                select: { id: true }
            });

            if (!citizen) {
                return errorResponse(400, 'Không tìm thấy tài khoản công dân');
            }

            // 2. Parse pagination
            const page = Math.max(1, query.page || 1);
            const limit = Math.min(100, Math.max(1, query.limit || 10));
            const skip = (page - 1) * limit;

            // 3. Build where clause
            const where: any = {
                citizenId: userId,
                deletedAt: null
            };

            if (query.status) {
                where.status = query.status;
            }

            // 4. Query với pagination + relationships
            const [reports, totalItems] = await Promise.all([
                this.prisma.report.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },

                }),
                this.prisma.report.count({ where })
            ]);

            // 5. Transform data
            const items = reports.map(report => ({
                id: report.id,
                status: report.status,
                address: report.address,
                provinceCode: report.provinceCode,
                districtCode: report.districtCode,
                wardCode: report.wardCode,
                description: report.description,
                createdAt: report.createdAt,
                cancelReason: report.cancelReason,

            }));
            // const items = reports.map(report => ({
            //     id: report.id,
            //     status: report.status,
            //     address: report.address,
            //     provinceCode: report.provinceCode,
            //     districtCode: report.districtCode,
            //     wardCode: report.wardCode,
            //     description: report.description,
            //     createdAt: report.createdAt,
            //     cancelReason: report.cancelReason,
            //     wasteItems: report.wasteItems.map(w => ({
            //         wasteType: w.wasteType,
            //         weightKg: Number(w.weightKg)
            //     })),
            //     images: report.images.map(i => i.imageUrl),
            //     enterpriseName: report.assignment?.enterprise?.name,
            //     collectorName: report.assignment?.collector?.user?.fullName
            // }));

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
            }, 'Lấy danh sách đơn thành công');

        } catch (error) {
            this.logger.error(`Error getting reports for user ${userId}:`, error);
            return errorResponse(500, 'Lỗi khi lấy danh sách đơn');
        }
    }
}
