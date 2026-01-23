import { Injectable, Logger } from '@nestjs/common'
// import { Cron, CronExpression } from '@nestjs/schedule' // Commented out - using external cron now
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { ReportAssignmentService } from './report-assignment.service'
import { getDistance } from 'geolib'

@Injectable()
export class ReportCronService {
    private readonly logger = new Logger(ReportCronService.name)
    private readonly RESPONSE_TIMEOUT_MINUTES_MS = 10 * 60 * 1000 // 10 minutes

    // Global lock để tránh multiple instances chạy đồng thời (still used by API methods)
    private static isProcessingPendingReports = false
    private static isHandlingTimeoutAttempts = false

    constructor(
        private prisma: PrismaService,
        private reportAssignment: ReportAssignmentService
    ) { }

    // 🚀 PUBLIC API METHODS - Có thể gọi từ bên ngoài
    async triggerProcessPendingReports(): Promise<{ success: boolean, message: string, data?: any }> {
        this.logger.debug('🚀 Bắt đầu triggerProcessPendingReports từ external cron')

        if (process.env.ENABLE_CRON !== 'true') {
            this.logger.debug('❌ ENABLE_CRON != true, bỏ qua')
            return { success: false, message: 'Cron is disabled' }
        }

        if (ReportCronService.isProcessingPendingReports) {
            this.logger.debug('⏳ Process đang chạy, bỏ qua lần này')
            return { success: false, message: 'Process already running' }
        }

        ReportCronService.isProcessingPendingReports = true
        const startTime = Date.now()
        this.logger.debug(`⏰ Bắt đầu xử lý lúc ${new Date().toISOString()}`)

        try {
            const pendingReports = await this.prisma.report.findMany({
                where: {
                    status: 'PENDING',
                    deletedAt: null
                },
                select: {
                    id: true,
                    latitude: true,
                    longitude: true,
                    provinceCode: true,
                    districtCode: true,
                    wardCode: true,
                    wasteItems: {
                        select: {
                            weightKg: true,
                            wasteType: true
                        }
                    },
                    reportEnterpriseAttempts: {
                        select: {
                            enterpriseId: true,
                            status: true,
                            sentAt: true
                        }
                    }
                }
            })

            this.logger.debug(`📊 Tìm thấy ${pendingReports.length} báo cáo PENDING`)

            if (pendingReports.length === 0) {
                this.logger.debug('📭 Không có báo cáo nào cần xử lý')
                return { success: true, message: 'No pending reports to process' }
            }

            this.logger.log(`📋 Đang xử lý ${pendingReports.length} báo cáo ở trạng thái PENDING`)

            let processedCount = 0
            let errorCount = 0

            for (const report of pendingReports) {
                try {
                    this.logger.debug(`🔄 Đang xử lý báo cáo ${report.id}`)
                    await this.dispatchSingleReport(report)
                    processedCount++
                    this.logger.debug(`✅ Báo cáo ${report.id} xử lý thành công`)
                } catch (error) {
                    this.logger.error(`❌ Xử lý báo cáo ${report.id} thất bại:`, error.message)
                    errorCount++
                }

                await new Promise(resolve => setTimeout(resolve, 100))
            }

            const duration = Date.now() - startTime
            const message = `Đã xử lý ${processedCount} báo cáo thành công, ${errorCount} lỗi trong ${duration}ms`

            this.logger.log(`✅ ${message}`)
            return { success: true, message, data: { processedCount, errorCount, duration } }

        } catch (error) {
            this.logger.error('💥 Lỗi khi xử lý danh sách PENDING:', error)
            return { success: false, message: 'Internal server error' }
        } finally {
            ReportCronService.isProcessingPendingReports = false
            this.logger.debug('🔚 Kết thúc triggerProcessPendingReports')
        }
    }

    async triggerHandleTimeoutAttempts(): Promise<{ success: boolean, message: string, data?: any }> {
        this.logger.debug('🚀 Bắt đầu triggerHandleTimeoutAttempts từ external cron')

        if (process.env.ENABLE_CRON !== 'true') {
            this.logger.debug('❌ ENABLE_CRON != true, bỏ qua')
            return { success: false, message: 'Cron is disabled' }
        }

        if (ReportCronService.isHandlingTimeoutAttempts) {
            this.logger.debug('⏳ Timeout handler đang chạy, bỏ qua lần này')
            return { success: false, message: 'Timeout handler already running' }
        }

        ReportCronService.isHandlingTimeoutAttempts = true
        this.logger.debug(`⏰ Bắt đầu xử lý timeout lúc ${new Date().toISOString()}`)

        try {
            this.logger.debug('🔍 Đang tìm các attempt đã timeout...')
            await this.reportAssignment.handleTimeoutAttempts()
            this.logger.debug('✅ Đã xử lý xong các timeout attempts')

            const message = 'Đã xử lý các timeout attempts thành công'
            this.logger.log(`✅ ${message}`)
            return { success: true, message }
        } catch (error) {
            this.logger.error('💥 Lỗi khi xử lý timeout attempts:', error)
            return { success: false, message: 'Internal server error' }
        } finally {
            ReportCronService.isHandlingTimeoutAttempts = false
            this.logger.debug('🔚 Kết thúc triggerHandleTimeoutAttempts')
        }
    }

    // COMMENTED OUT - Using external cron API instead
    // @Cron(CronExpression.EVERY_MINUTE)
    // async processPendingReports() {
    //     console.log(process.env.ENABLE_CRON)
    //     if (process.env.ENABLE_CRON !== 'true') return;
    //     // Global lock: Skip nếu đã có instance đang chạy
    //     if (ReportCronService.isProcessingPendingReports) {
    //         this.logger.debug('⏳ processPendingReports đang chạy, bỏ qua lần này')
    //         return
    //     }

    //     ReportCronService.isProcessingPendingReports = true

    //     try {
    //         const pendingReports = await this.prisma.report.findMany({
    //             where: {
    //                 status: 'PENDING',
    //                 deletedAt: null
    //             },
    //             select: {
    //                 id: true,
    //                 latitude: true,
    //                 longitude: true,
    //                 provinceCode: true,
    //                 districtCode: true,
    //                 wardCode: true,
    //                 wasteItems: {
    //                     select: {
    //                         weightKg: true,
    //                         wasteType: true
    //                     }
    //                 },
    //                 reportEnterpriseAttempts: {
    //                     select: {
    //                         enterpriseId: true,
    //                         status: true,
    //                         sentAt: true
    //                     }
    //                 }
    //             }
    //         })

    //         if (pendingReports.length === 0) {
    //             this.logger.debug("Không có đơn xử lý")
    //             return
    //         }

    //         this.logger.log(`📋 Đang xử lý ${pendingReports.length} báo cáo ở trạng thái PENDING`)

    //         for (const report of pendingReports) {
    //             try {
    //                 await this.dispatchSingleReport(report)
    //             } catch (error) {
    //                 this.logger.error(`❌ Xử lý báo cáo ${report.id} thất bại:`, error.message)
    //             }

    //             await new Promise(resolve => setTimeout(resolve, 100))
    //         }

    //     } catch (error) {
    //         this.logger.error('💥 Lỗi khi xử lý danh sách PENDING:', error)
    //     } finally {
    //         // Đảm bảo luôn release lock
    //         ReportCronService.isProcessingPendingReports = false
    //     }
    // }

    private async dispatchSingleReport(report: any): Promise<void> {
        this.logger.debug(`🔍 Bắt đầu xử lý report ${report.id} tại ${report.latitude}, ${report.longitude}`)
        const WAITING_TIMEOUT_MS = 10 * 60 * 1000

        const waitingAttempt = report.reportEnterpriseAttempts.find(
            (a: any) => a.status === 'WAITING'
        )

        if (waitingAttempt) {
            this.logger.debug(`⏳ Report ${report.id} đang có attempt WAITING từ DN ${waitingAttempt.enterpriseId}`)
            const isExpired =
                Date.now() - new Date(waitingAttempt.sentAt).getTime() > WAITING_TIMEOUT_MS

            if (!isExpired) {
                this.logger.debug(
                    `⏸ Báo cáo ${report.id} vẫn đang chờ DN ${waitingAttempt.enterpriseId} phản hồi`
                )
                return
            }

            this.logger.debug(`⏰ Attempt đã timeout, đánh dấu EXPIRED`)
            await this.prisma.reportEnterpriseAttempt.update({
                where: { id: waitingAttempt.id },
                data: { status: 'EXPIRED' }
            })

            this.logger.warn(
                `⌛ Báo cáo ${report.id} - DN ${waitingAttempt.enterpriseId} đã hết hạn phản hồi`
            )
        }

        this.logger.debug(`🏢 Đang tìm DN phù hợp cho report ${report.id}`)
        const eligibleEnterprises = await this.findEligibleEnterprises(report)
        this.logger.debug(`📊 Tìm thấy ${eligibleEnterprises.length} DN phù hợp`)

        if (eligibleEnterprises.length === 0) {
            this.logger.debug(`⚠️ Không có DN phù hợp cho báo cáo ${report.id}`)
            return
        }

        const attemptedIds = report.reportEnterpriseAttempts.map(
            (a: any) => a.enterpriseId
        )
        this.logger.debug(`🚫 Đã thử ${attemptedIds.length} DN: [${attemptedIds.join(', ')}]`)

        const availableEnterprises = eligibleEnterprises.filter(
            e => !attemptedIds.includes(e.id)
        )
        this.logger.debug(`✅ Còn ${availableEnterprises.length} DN khả dụng`)

        if (availableEnterprises.length === 0) {
            this.logger.debug(`⚠️ Không còn DN khả dụng cho báo cáo ${report.id}`)
            return
        }

        this.logger.debug(`📍 Đang tính khoảng cách từ report đến ${availableEnterprises.length} DN...`)
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
        const distance = allEnterprisesWithDistance[0].distance

        this.logger.debug(`🎯 Chọn DN gần nhất: ${chosenEnterprise.name} (${distance.toFixed(1)}km)`)

        const nextPriorityOrder =
            report.reportEnterpriseAttempts.length + 1

        this.logger.debug(`📝 Tạo attempt mới với priority ${nextPriorityOrder}`)
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

        this.logger.debug(`📱 Đang gửi thông báo tới DN ${chosenEnterprise.id}`)
        await this.sendNotificationToEnterprise(
            chosenEnterprise.id,
            report.id
        )

        this.logger.log(
            `📤 Báo cáo ${report.id} → DN ${chosenEnterprise.name} (${distance.toFixed(1)}km, priority ${nextPriorityOrder})`
        )
        this.logger.debug(`✅ Hoàn thành xử lý report ${report.id}`)
    }


    private async findEligibleEnterprises(report: any) {
        const totalWeightKg = report.wasteItems.reduce(
            (acc: number, w: any) => acc + Number(w.weightKg),
            0
        )

        const wasteTypeEnums = report.wasteItems.map((w: any) => w.wasteType)

        // Query tối ưu: Chỉ lấy enterprise IDs thay vì full objects
        const enterpriseIds = await this.prisma.enterprise.findMany({
            where: {
                AND: [
                    { status: 'ACTIVE' },
                    { deletedAt: null },
                    { capacityKg: { gte: totalWeightKg } },
                    // Subscription check - tối ưu hơn
                    {
                        subscriptions: {
                            some: {
                                isActive: true,
                                endDate: { gte: new Date() }
                            }
                        }
                    }
                ]
            },
            select: { id: true }
        })

        if (enterpriseIds.length === 0) return []

        const ids = enterpriseIds.map(e => e.id)

        // Tách riêng waste types check để giảm JOIN
        const enterprisesWithWasteTypes = await this.prisma.enterprise.findMany({
            where: {
                id: { in: ids },
                AND: wasteTypeEnums.map(wasteType => ({
                    wasteTypes: {
                        some: { wasteType }
                    }
                }))
            },
            select: { id: true }
        })

        const wasteTypeIds = enterprisesWithWasteTypes.map(e => e.id)

        // Tách riêng service areas check
        const enterprisesWithServiceAreas = await this.prisma.enterprise.findMany({
            where: {
                id: { in: wasteTypeIds },
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
            select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                capacityKg: true
            }
        })

        return enterprisesWithServiceAreas
    }

    // COMMENTED OUT - Using external cron API instead
    // @Cron('0 */5 * * * *')
    // async handleTimeoutAttempts() {
    //     if (process.env.ENABLE_CRON !== 'true') return;
    //     // Global lock: Skip nếu đã có instance đang chạy
    //     if (ReportCronService.isHandlingTimeoutAttempts) {
    //         this.logger.debug('⏳ handleTimeoutAttempts đang chạy, bỏ qua lần này')
    //         return
    //     }

    //     ReportCronService.isHandlingTimeoutAttempts = true

    //     try {
    //         await this.reportAssignment.handleTimeoutAttempts()
    //     } catch (error) {
    //         this.logger.error('💥 Lỗi khi xử lý timeout attempts:', error)
    //     } finally {
    //         // Đảm bảo luôn release lock
    //         ReportCronService.isHandlingTimeoutAttempts = false
    //     }
    // }


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
