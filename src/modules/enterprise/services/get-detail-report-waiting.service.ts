import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { errorResponse, successResponse } from 'src/common/utils/response.util'
import { getDistance } from 'geolib'

@Injectable()
export class GetDetailReportWaitingService {
    private readonly logger = new Logger(GetDetailReportWaitingService.name)

    constructor(private readonly prisma: PrismaService) { }


    async getDetail(userId: number, reportId: number) {
        // 1. Kiểm tra enterprise
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true, latitude: true, longitude: true }
        })

        if (!enterprise) {
            return errorResponse(400, 'Bạn không phải doanh nghiệp')
        }

        // 2. Lấy report theo ID
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            include: {
                wasteItems: true,
                images: true,
                citizen: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        avatar: true
                    }
                },

            }
        })

        if (!report) {
            return errorResponse(404, 'Không tìm thấy đơn này')
        }



        // 6. Tính khoảng cách từ enterprise đến report
        const distanceKm = enterprise.latitude && enterprise.longitude
            ? getDistance(
                { latitude: enterprise.latitude, longitude: enterprise.longitude },
                { latitude: report.latitude, longitude: report.longitude }
            ) / 1000
            : 0

        // 7. Trả về chi tiết
        return successResponse(200, {


            isCancelled: !!report.deletedAt,
            cancelReason: report.cancelReason,

            report: {
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

                wasteItems: report.wasteItems.map(w => ({
                    wasteType: w.wasteType,
                    weightKg: Number(w.weightKg)
                })),

                images: report.images.map(i => i.imageUrl),

                citizen: report.citizen
            },

            distanceKm: Math.round(distanceKm * 10) / 10,
        }, 'Lấy chi tiết thành công')


    }
}
