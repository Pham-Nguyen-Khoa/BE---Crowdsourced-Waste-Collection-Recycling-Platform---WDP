import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { ReportAssignmentService } from './report-assignment.service'
import { getDistance } from 'geolib'

@Injectable()
export class ReportCronService {
    private readonly logger = new Logger(ReportCronService.name)
    private readonly RESPONSE_TIMEOUT_MINUTES_MS = 10 * 60 * 1000 // 10 minutes

    constructor(
        private prisma: PrismaService,
        private reportAssignment: ReportAssignmentService
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async processPendingReports() {
        try {
            const pendingReports = await this.prisma.report.findMany({
                where: {
                    status: 'PENDING',
                    deletedAt: null
                },
                include: {
                    wasteItems: true,
                    reportEnterpriseAttempts: true
                }
            })

            if (pendingReports.length === 0) {
                console.log("Không có đơn xử lý")
                return
            }

            this.logger.log(`📋 Đang xử lý ${pendingReports.length} báo cáo ở trạng thái PENDING`)

            for (const report of pendingReports) {
                try {
                    await this.dispatchSingleReport(report)
                } catch (error) {
                    this.logger.error(`❌ Xử lý báo cáo ${report.id} thất bại:`, error.message)
                }

                await new Promise(resolve => setTimeout(resolve, 100))
            }

        } catch (error) {
            this.logger.error('💥 Lỗi khi xử lý danh sách PENDING:', error)
        }
    }

    private async dispatchSingleReport(report: any): Promise<void> {
        const WAITING_TIMEOUT_MS = 10 * 60 * 1000

        const waitingAttempt = report.reportEnterpriseAttempts.find(
            (a: any) => a.status === 'WAITING'
        )

        if (waitingAttempt) {
            const isExpired =
                Date.now() - new Date(waitingAttempt.sentAt).getTime() > WAITING_TIMEOUT_MS

            if (!isExpired) {
                this.logger.debug(
                    `⏸ Báo cáo ${report.id} đang chờ DN ${waitingAttempt.enterpriseId} phản hồi`
                )
                return
            }

            await this.prisma.reportEnterpriseAttempt.update({
                where: { id: waitingAttempt.id },
                data: { status: 'EXPIRED' }
            })

            this.logger.warn(
                `⌛ Báo cáo ${report.id} - DN ${waitingAttempt.enterpriseId} đã hết hạn phản hồi`
            )
        }

        const eligibleEnterprises = await this.findEligibleEnterprises(report)
        if (eligibleEnterprises.length === 0) {
            this.logger.debug(`⚠️ Không có DN phù hợp cho báo cáo ${report.id}`)
            return
        }

        const attemptedIds = report.reportEnterpriseAttempts.map(
            (a: any) => a.enterpriseId
        )

        const availableEnterprises = eligibleEnterprises.filter(
            e => !attemptedIds.includes(e.id)
        )

        if (availableEnterprises.length === 0) {
            this.logger.debug(`⚠️ Không còn DN khả dụng cho báo cáo ${report.id}`)
            return
        }

        const allEnterprisesWithDistance = availableEnterprises
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

        const chosenEnterprise = allEnterprisesWithDistance[0].enterprise;

        this.logger.debug(`Danh sách DN khả dụng: ${availableEnterprises.map(e => e.name)}`)
        this.logger.debug(`DN được chọn: ${chosenEnterprise.name}`)
        this.logger.debug(`Khoang cach tat ca doanh nghiep tu bao cao den DN: ${allEnterprisesWithDistance.map(e => `${e.enterprise.name} - ${e.distance}`)}`)
        this.logger.debug(`Khoảng cách: ${this.calculateDistance(
            report.latitude,
            report.longitude,
            chosenEnterprise.latitude,
            chosenEnterprise.longitude
        )}`)

        const nextPriorityOrder =
            report.reportEnterpriseAttempts.length + 1

        await this.prisma.reportEnterpriseAttempt.create({
            data: {
                reportId: report.id,
                enterpriseId: chosenEnterprise.id,
                priorityOrder: nextPriorityOrder,
                status: 'WAITING',
                sentAt: new Date(),
                expiredAt: new Date(Date.now() + this.RESPONSE_TIMEOUT_MINUTES_MS)
            }
        })

        await this.sendNotificationToEnterprise(
            chosenEnterprise.id,
            report.id
        )

        this.logger.log(
            `📤 Báo cáo ${report.id} → DN ${chosenEnterprise.name} (priority ${nextPriorityOrder})`
        )
    }


    private async findEligibleEnterprises(report: any) {
        const totalWeightKg = report.wasteItems.reduce(
            (acc: number, w: any) => acc + Number(w.weightKg),
            0
        )

        const wasteTypeEnums = report.wasteItems.map((w: any) => w.wasteType)

        return await this.prisma.enterprise.findMany({
            where: {
                AND: [
                    { status: 'ACTIVE' },
                    { deletedAt: null },
                    {
                        subscriptions: {
                            some: {
                                isActive: true,
                                endDate: { gte: new Date() }
                            }
                        }
                    },
                    {
                        AND: wasteTypeEnums.map(wasteType => ({
                            wasteTypes: {
                                some: { wasteType }
                            }
                        }))
                    },
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
                    { capacityKg: { gte: totalWeightKg } }
                ]
            }
        })
    }

    @Cron('0 */5 * * * *')
    async handleTimeoutAttempts() {
        try {
            await this.reportAssignment.handleTimeoutAttempts()
        } catch (error) {
            this.logger.error('💥 Lỗi khi xử lý timeout attempts:', error)
        }
    }


    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const distanceInMeters = getDistance(
            { latitude: lat1, longitude: lon1 },
            { latitude: lat2, longitude: lon2 }
        )

        return distanceInMeters / 1000
    }

    private testGeolibDistance(): void {
        const hanoiToHcmc = this.calculateDistance(21.0285, 105.8542, 10.8231, 106.6297)
        this.logger.log(`🧪 Test geolib: Hanoi → HCMC = ${hanoiToHcmc.toFixed(1)}km (expected: ~1150km)`)

        const shortDistance = this.calculateDistance(21.0285, 105.8542, 21.0375, 105.8542)
        this.logger.log(`🧪 Test geolib: Short distance = ${shortDistance.toFixed(3)}km (expected: ~1km)`)
    }

    private async sendNotificationToEnterprise(enterpriseId: number, reportId: number): Promise<void> {
        this.logger.log(`📱 Đã gửi thông báo tới doanh nghiệp ${enterpriseId} cho báo cáo ${reportId}`)
    }
}
