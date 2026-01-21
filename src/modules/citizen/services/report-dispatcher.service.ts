import { Injectable, Logger } from "@nestjs/common"
import { EnterpriseStatus } from "@prisma/client"
import { PrismaService } from "src/libs/prisma/prisma.service"

@Injectable()
export class ReportDispatcherService {
    private readonly logger = new Logger(ReportDispatcherService.name)

    constructor(private prisma: PrismaService) { }

    async dispatch(reportId: number) {
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            include: { wasteItems: true }
        })
        if (!report) return
        if (report.status !== 'PENDING') return

        const wasteTypeEnums = report.wasteItems.map(w => w.wasteType)
        const totalWeightKg = report.wasteItems.reduce(
            (acc, w) => acc + Number(w.weightKg),
            0
        )

        const rejectedIds = await this.getRejectedEnterpriseIds(reportId)
        const enterprises = await this.prisma.enterprise.findMany({
            where: {
                AND: [
                    { id: { notIn: rejectedIds } },
                    { status: EnterpriseStatus.ACTIVE },
                    { deletedAt: null },

                    {
                        subscriptions: {
                            some: {
                                isActive: true,
                                endDate: { gte: new Date() }
                            }
                        }
                    },

                    // Phải nhận TẤT CẢ loại rác
                    {
                        AND: wasteTypeEnums.map(wasteType => ({
                            wasteTypes: {
                                some: { wasteType }
                            }
                        }))
                    },

                    // Match khu vực (OR nhiều cấp)
                    {
                        OR: [
                            {
                                serviceAreas: {
                                    some: {
                                        provinceCode: report.provinceCode,
                                        districtCode: report.districtCode,
                                        wardCode: report.wardCode
                                    }
                                }
                            },
                            {
                                serviceAreas: {
                                    some: {
                                        provinceCode: report.provinceCode,
                                        districtCode: report.districtCode,
                                        wardCode: null
                                    }
                                }
                            },
                            {
                                serviceAreas: {
                                    some: {
                                        provinceCode: report.provinceCode,
                                        districtCode: null,
                                        wardCode: null
                                    }
                                }
                            }
                        ]
                    },

                    // Capacity
                    { capacityKg: { gte: totalWeightKg } },

                    // Có ít nhất 1 collector available
                    {
                        collectors: {
                            some: {
                                deletedAt: null,
                                status: { status: 'AVAILABLE' }
                            }
                        }
                    }
                ]
            },
            include: {
                workingHour: true
            }
        })

        if (enterprises.length === 0) {
            this.logger.log(`No enterprise available for report ${reportId}`)
            return
        }

        // 3️⃣ Lọc theo giờ làm việc
        const now = new Date()
        const activeEnterprises = enterprises.filter(e =>
            this.isWithinWorkingHour(e.workingHour, now)
        )

        if (activeEnterprises.length === 0) {
            this.logger.log(`No enterprise working now for report ${reportId}`)
            return
        }

        // 4️⃣ Sort theo khoảng cách
        const ranked = activeEnterprises
            .map(e => ({
                enterprise: e,
                distance: this.calculateDistance(
                    report.latitude,
                    report.longitude,
                    e.latitude,
                    e.longitude
                )
            }))
            .sort((a, b) => a.distance - b.distance)

        const chosenEnterprise = ranked[0].enterprise

        // 5️⃣ Gửi notification
        await this.sendEnterpriseNotification(chosenEnterprise.id, report.id)

        // 6️⃣ Update report với sentAt timestamp
        await this.prisma.report.update({
            where: { id: report.id },
            data: {
                currentEnterpriseId: chosenEnterprise.id,
                sentAt: new Date() // Track khi nào gửi notification
            }
        })

        this.logger.log(
            `Report ${report.id} dispatched to enterprise ${chosenEnterprise.id}`
        )
    }

    // =========================
    // Helpers
    // =========================

    private async getRejectedEnterpriseIds(reportId: number): Promise<number[]> {
        const rejected = await this.prisma.reportRejectedEnterprise.findMany({
            where: { reportId },
            select: { enterpriseId: true }
        })
        return rejected.map(r => r.enterpriseId)
    }

    private isWithinWorkingHour(workingHour: any, now: Date): boolean {
        if (!workingHour) return true

        const currentMinutes = now.getHours() * 60 + now.getMinutes()

        const [startH, startM] = workingHour.startTime.split(':').map(Number)
        const [endH, endM] = workingHour.endTime.split(':').map(Number)

        const startMinutes = startH * 60 + startM
        const endMinutes = endH * 60 + endM

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    }

    private calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371
        const dLat = this.toRad(lat2 - lat1)
        const dLon = this.toRad(lon2 - lon1)
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    private toRad(value: number): number {
        return (value * Math.PI) / 180
    }

    private async sendEnterpriseNotification(
        enterpriseId: number,
        reportId: number
    ) {
        // TODO: socket / push / email
    }
}
