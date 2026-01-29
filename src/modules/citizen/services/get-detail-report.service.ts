import { Injectable, Logger } from "@nestjs/common";
import { successResponse, errorResponse } from "src/common/utils/response.util";
import { PrismaService } from "src/libs/prisma/prisma.service";

@Injectable()
export class GetDetailReportService {
    private readonly logger = new Logger(GetDetailReportService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getDetailReport(userId: number, reportId: number) {


        // 2. Lấy report theo ID
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            include: {
                wasteItems: true,
                images: true,
                assignment: {
                    include: {
                        enterprise: {
                            select: {
                                id: true,
                                name: true,
                                user: { select: { phone: true, avatar: true } }
                            }
                        },
                        collector: {
                            include: {
                                user: {
                                    select: { id: true, fullName: true, phone: true ,avatar: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!report) {
            return errorResponse(404, 'Không tìm thấy đơn này');
        }

        // 3. Kiểm tra quyền sở hữu
        if (report.citizenId !== userId) {
            return errorResponse(403, 'Bạn không có quyền xem đơn này');
        }

        // 4. Format response
        const response = {
            id: report.id,
            status: report.status,
            address: report.address,
            latitude: report.latitude,
            longitude: report.longitude,
            provinceCode: report.provinceCode,
            districtCode: report.districtCode,
            wardCode: report.wardCode,
            description: report.description,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
            cancelReason: report.cancelReason,
            wasteItems: report.wasteItems.map(w => ({
                wasteType: w.wasteType,
                weightKg: Number(w.weightKg)
            })),
            images: report.images.map(i => i.imageUrl),
            enterprise: report.assignment?.enterprise ? {
                id: report.assignment.enterprise.id,
                name: report.assignment.enterprise.name,
                phone: report.assignment.enterprise.user?.phone,
                avatar: report.assignment.enterprise.user?.avatar
            } : null,
            collector: report.assignment?.collector ? {
                id: report.assignment.collector.id,
                fullName: report.assignment.collector.user?.fullName,
                phone: report.assignment.collector.user?.phone,
                avatar: report.assignment.collector.user?.avatar
            } : null
        };

        return successResponse(200, response, 'Lấy chi tiết thành công');


    }
}
