/**
 * CRON CONFIGURATION MODES:
 *
 * 1. INTERNAL CRON (NestJS):
 *    - Uncomment @Cron decorators below
 *    - Set ENABLE_CRON=true
 *    - Cron chạy tự động trong app
 *
 * 2. EXTERNAL CRON (API):
 *    - Comment out @Cron decorators below
 *    - Use external cron services to call:
 *      - POST /citizen/cron/process-pending-reports (every 1 min)
 *      - POST /citizen/cron/handle-timeout-attempts (every 5 min)
 */

import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { ReportAssignmentService } from './report-assignment.service'
import { DispatchLogService } from './dispatch-log.service'
import { NotificationService } from '../../notification/services/notification.service'
import { NotificationGateway } from '../../notification/gateways/notification.gateway'
import { getDistance } from 'geolib'
import { NotificationType } from 'generated/prisma/enums'

@Injectable()
export class ReportCronService {
    private readonly logger = new Logger(ReportCronService.name)
    private readonly RESPONSE_TIMEOUT_MINUTES_MS = 10 * 60 * 1000 // 10 minutes

    // Global lock để tránh multiple instances chạy đồng thời
    private static isProcessingPendingReports = false
    private static isHandlingTimeoutAttempts = false


    constructor(
        private prisma: PrismaService,
        private reportAssignment: ReportAssignmentService,
        private dispatchLog: DispatchLogService,
        private notificationService: NotificationService,
        private notificationGateway: NotificationGateway
    ) { }

    private logAndPersist(level: 'log' | 'debug' | 'error' | 'warn', message: string, meta: Record<string, any> = {}, source: string = 'system') {
        try {
            if (level === 'log') this.logger.log(message)
            else if (level === 'debug') this.logger.debug(message)
            else if (level === 'warn') this.logger.warn(message)
            else this.logger.error(message)

            const normalizedMeta = { source, timestamp: new Date().toISOString(), ...meta }
            this.dispatchLog.create({ level: level.toUpperCase(), message, meta: normalizedMeta }).catch(err => {
                this.logger.debug('Failed to write dispatch log (non-blocking)', err?.message || err)
            })
        } catch (error) {
            this.logger.debug('logAndPersist failed', error?.message || error)
        }
    }

    // 🚀 PUBLIC API METHODS - Có thể gọi từ bên ngoài
    async triggerProcessPendingReports(): Promise<{ success: boolean, message: string, data?: any }> {

        if (process.env.ENABLE_CRON !== 'true') {
            return { success: false, message: 'Cron is disabled' }
        }

        if (ReportCronService.isProcessingPendingReports) {
            return { success: false, message: 'Process already running' }
        }

        ReportCronService.isProcessingPendingReports = true
        const startTime = Date.now()

        try {
            // Log to DB that external trigger started (non-blocking)
            this.logAndPersist('log', 'Người dùng/bên ngoài yêu cầu xử lý các báo cáo PENDING', { requestedAt: new Date().toISOString() }, 'external-trigger')
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


            if (pendingReports.length === 0) {
                this.logAndPersist('debug', ' Không có báo cáo nào cần xử lý', {}, 'external-trigger')
                return { success: true, message: 'No pending reports to process' }
            }
            this.logAndPersist('debug', `📊 Tìm thấy ${pendingReports.length} báo cáo PENDING`, { found: pendingReports.length }, 'external-trigger')


            this.logAndPersist('log', `📋 Đang xử lý ${pendingReports.length} báo cáo ở trạng thái PENDING`, { total: pendingReports.length }, 'external-trigger')

            let processedCount = 0
            let errorCount = 0

            for (const report of pendingReports) {
                try {
                    this.logAndPersist('debug', `🔄 Đang xử lý báo cáo ${report.id}`, { reportId: report.id }, 'external-trigger')
                    await this.dispatchSingleReport(report)
                    processedCount++
                    this.logAndPersist('debug', `✅ Báo cáo ${report.id} xử lý thành công`, { reportId: report.id }, 'external-trigger')
                } catch (error) {
                    this.logAndPersist('error', `❌ Xử lý báo cáo ${report.id} thất bại: ${error?.message || ''}`, { reportId: report.id, error: error?.message || null }, 'external-trigger')
                    errorCount++
                }

                await new Promise(resolve => setTimeout(resolve, 100))
            }

            const duration = Date.now() - startTime
            const message = `Đã xử lý ${processedCount} báo cáo thành công, ${errorCount} lỗi trong ${duration}ms`

            this.logAndPersist('log', `✅ ${message}`, { processedCount, errorCount, duration }, 'external-trigger')
            return { success: true, message, data: { processedCount, errorCount, duration } }

        } catch (error) {
            this.logAndPersist('error', `💥 Lỗi khi xử lý danh sách PENDING: ${error?.message || ''}`, { error: error?.message || null }, 'external-trigger')
            return { success: false, message: 'Internal server error' }
        } finally {
            ReportCronService.isProcessingPendingReports = false
        }
    }

    async triggerHandleTimeoutAttempts(): Promise<{ success: boolean, message: string, data?: any }> {

        if (process.env.ENABLE_CRON !== 'true') {
            return { success: false, message: 'Cron is disabled' }
        }

        if (ReportCronService.isHandlingTimeoutAttempts) {
            return { success: false, message: 'Timeout handler already running' }
        }

        ReportCronService.isHandlingTimeoutAttempts = true

        try {
            // Log external trigger for timeout handling
            this.logAndPersist('log', 'Người dùng/bên ngoài yêu cầu xử lý các attempt đã hết hạn', { requestedAt: new Date().toISOString() }, 'external-trigger')
            await this.reportAssignment.handleTimeoutAttempts()
            const message = 'Đã xử lý các timeout attempts thành công'
            this.logAndPersist('log', `✅ ${message}`, {}, 'external-trigger')
            return { success: true, message }
        } catch (error) {
            this.logAndPersist('error', `💥 Lỗi khi xử lý timeout attempts: ${error?.message || ''}`, { error: error?.message || null }, 'external-trigger')
            return { success: false, message: 'Internal server error' }
        } finally {
            ReportCronService.isHandlingTimeoutAttempts = false
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async processPendingReports() {
        if (process.env.ENABLE_CRON !== 'true') return;
        // Global lock: Skip nếu đã có instance đang chạy
        if (ReportCronService.isProcessingPendingReports) {
            return
        }

        ReportCronService.isProcessingPendingReports = true

        try {
            this.logAndPersist('log', `Bắt đầu đăng ký xử lý các báo cáo ở trạng thái PENDING`, { env: process.env.ENABLE_CRON || null }, 'cron-scheduler')
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

            if (pendingReports.length === 0) {
                this.logAndPersist('debug', "Không có đơn xử lý", {}, 'cron-scheduler')
                return
            }

            this.logAndPersist('log', `📋 Đang xử lý ${pendingReports.length} báo cáo ở trạng thái PENDING`, { total: pendingReports.length }, 'cron-scheduler')

            for (const report of pendingReports) {
                try {
                    await this.dispatchSingleReport(report)
                } catch (error) {
                    this.logAndPersist('error', `❌ Xử lý báo cáo ${report.id} thất bại: ${error?.message || ''}`, { error: error?.message || null, reportId: report.id }, 'cron-scheduler')
                }

                await new Promise(resolve => setTimeout(resolve, 100))
            }

        } catch (error) {
            this.logAndPersist('error', `💥 Lỗi khi xử lý danh sách PENDING: ${error?.message || ''}`, { error: error?.message || null }, 'cron-scheduler')
        } finally {
            // Đảm bảo luôn release lock
            ReportCronService.isProcessingPendingReports = false
        }
    }

    @Cron('0 */5 * * * *')
    async handleTimeoutAttempts() {
        if (process.env.ENABLE_CRON !== 'true') return;
        // Global lock: Skip nếu đã có instance đang chạy
        if (ReportCronService.isHandlingTimeoutAttempts) {
            return
        }

        ReportCronService.isHandlingTimeoutAttempts = true

        try {
            await this.reportAssignment.handleTimeoutAttempts()
        } catch (error) {
            this.logAndPersist('error', `💥 Lỗi khi xử lý timeout attempts: ${error?.message || ''}`, { error: error?.message || null }, 'cron-scheduler')
        } finally {
            // Đảm bảo luôn release lock
            ReportCronService.isHandlingTimeoutAttempts = false
        }
    }

    private async dispatchSingleReport(report: any): Promise<void> {
        // ✅ KIỂM TRA: Report có còn hợp lệ không (chưa bị hủy)
        const currentReport = await this.prisma.report.findUnique({
            where: { id: report.id },
            select: { deletedAt: true, status: true }
        })

        if (currentReport && currentReport.deletedAt) {
            this.logAndPersist('debug', `🚫 Bỏ qua báo cáo ${report.id} đã bị hủy`, { reportId: report.id }, 'dispatch')
            return
        }

        this.logAndPersist('debug', `🔍 Bắt đầu xử lý report ${report.id} tại ${report.latitude}, ${report.longitude}`, { reportId: report.id, lat: report.latitude, lng: report.longitude }, 'dispatch')
        const WAITING_TIMEOUT_MS = 10 * 60 * 1000

        const waitingAttempt = report.reportEnterpriseAttempts.find(
            (a: any) => a.status === 'WAITING'
        )

        if (waitingAttempt) {
            this.logAndPersist('debug', `⏳ Report ${report.id} đang có attempt WAITING từ DN ${waitingAttempt.enterpriseId}`, { reportId: report.id, enterpriseId: waitingAttempt.enterpriseId }, 'dispatch')
            const isExpired =
                Date.now() - new Date(waitingAttempt.sentAt).getTime() > WAITING_TIMEOUT_MS

            if (!isExpired) {
                this.logAndPersist('debug', `⏸ Báo cáo ${report.id} vẫn đang chờ DN ${waitingAttempt.enterpriseId} phản hồi`, { reportId: report.id, enterpriseId: waitingAttempt.enterpriseId }, 'dispatch')
                return
            }

            this.logAndPersist('debug', `⏰ Attempt đã timeout, đánh dấu EXPIRED`, { reportId: report.id, attemptId: waitingAttempt.id, enterpriseId: waitingAttempt.enterpriseId }, 'dispatch')
            await this.prisma.reportEnterpriseAttempt.update({
                where: { id: waitingAttempt.id },
                data: { status: 'EXPIRED' }
            })

            this.logAndPersist('warn', `⌛ Báo cáo ${report.id} - DN ${waitingAttempt.enterpriseId} đã hết hạn phản hồi`, { reportId: report.id, enterpriseId: waitingAttempt.enterpriseId, attemptId: waitingAttempt.id }, 'dispatch')
        }

        this.logAndPersist('debug', `🏢 Đang tìm DN phù hợp cho report ${report.id}`, { reportId: report.id }, 'dispatch')
        const eligibleEnterprises = await this.findEligibleEnterprises(report)
        this.logAndPersist('debug', `📊 Tìm thấy ${eligibleEnterprises.length} DN phù hợp`, { count: eligibleEnterprises.length }, 'dispatch')

        if (eligibleEnterprises.length === 0) {
            this.logAndPersist('debug', `⚠️ Không có DN phù hợp cho báo cáo ${report.id}`, { reportId: report.id }, 'dispatch')
            return
        }

        const attemptedIds = report.reportEnterpriseAttempts.map(
            (a: any) => a.enterpriseId
        )
        this.logAndPersist('debug', `🚫 Đã thử ${attemptedIds.length} DN: [${attemptedIds.join(', ')}]`, { attempted: attemptedIds }, 'dispatch')

        const availableEnterprises = eligibleEnterprises.filter(
            e => !attemptedIds.includes(e.id)
        )
        this.logAndPersist('debug', `✅ Còn ${availableEnterprises.length} DN khả dụng`, { available: availableEnterprises.length }, 'dispatch')

        if (availableEnterprises.length === 0) {
            this.logAndPersist('debug', `⚠️ Không còn DN khả dụng cho báo cáo ${report.id}`, { reportId: report.id }, 'dispatch')
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
        const distance = allEnterprisesWithDistance[0].distance
        this.logAndPersist('debug', `🎯 Chọn DN gần nhất: ${chosenEnterprise.name} (${distance.toFixed(1)}km)`, { enterpriseId: chosenEnterprise.id, distance }, 'dispatch')

        const nextPriorityOrder =
            report.reportEnterpriseAttempts.length + 1

        const attempt = await this.prisma.reportEnterpriseAttempt.create({
            data: {
                reportId: report.id,
                enterpriseId: chosenEnterprise.id,
                priorityOrder: nextPriorityOrder,
                status: 'WAITING',
                sentAt: new Date(),
                expiredAt: new Date(Date.now() + this.RESPONSE_TIMEOUT_MINUTES_MS)
            }
        })

        this.logAndPersist('log', `Tạo yêu cầu (attempt) cho báo cáo ${report.id} gửi tới DN ${chosenEnterprise.id}`, { reportId: report.id, attemptId: attempt.id, enterpriseId: chosenEnterprise.id, distance }, 'dispatch')

        // create persisted notification and emit in real-time to enterprise user if available
        try {
            const ent = await this.prisma.enterprise.findUnique({
                where: { id: chosenEnterprise.id },
                select: { userId: true }
            })
            if (ent?.userId) {
                const notifResponse = await this.notificationService.create({
                    userId: ent.userId,
                    type: NotificationType.REPORT_ASSIGNED,
                    title: 'Bạn được gán đơn',
                    content: `Có báo cáo mới được gửi tới doanh nghiệp bạn.`,
                    meta: { reportId: report.id, attemptId: attempt.id }
                })
                const notif = notifResponse
                const payload = { id: notif?.id, title: notif?.title, type: notif?.type, content: notif?.content, meta: notif?.meta, createdAt: notif?.createdAt }
                this.notificationGateway.notifyUser(ent.userId, payload)
            }
        } catch (err) {
            this.logger.debug('Failed to notify enterprise user', err?.message || err)
        }

        this.logAndPersist('debug', `📱 Đang gửi thông báo tới DN ${chosenEnterprise.id}`, { enterpriseId: chosenEnterprise.id, reportId: report.id }, 'dispatch')
        await this.sendNotificationToEnterprise(
            chosenEnterprise.id,
            report.id
        )

        this.logAndPersist('log', `📤 Báo cáo ${report.id} → DN ${chosenEnterprise.name} (${distance.toFixed(1)}km, priority ${nextPriorityOrder})`, { reportId: report.id, enterpriseId: chosenEnterprise.id, distance, attemptId: attempt.id }, 'dispatch')
        this.logAndPersist('debug', `✅ Hoàn thành xử lý report ${report.id}`, { reportId: report.id }, 'dispatch')
    }


    // Public wrapper so admin controller can trigger dispatch for a single report (replay)
    async triggerDispatchReport(reportId: number) {
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
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
                        id: true,
                        enterpriseId: true,
                        status: true,
                        sentAt: true
                    }
                }
            }
        })

        if (!report) {
            throw new Error('Report not found')
        }

        await this.dispatchSingleReport(report)
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




    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const distanceInMeters = getDistance(
            { latitude: lat1, longitude: lon1 },
            { latitude: lat2, longitude: lon2 }
        )

        return distanceInMeters / 1000
    }


    private async sendNotificationToEnterprise(enterpriseId: number, reportId: number): Promise<void> {
        this.logAndPersist('log', `📱 Đã gửi thông báo tới doanh nghiệp ${enterpriseId} cho báo cáo ${reportId}`, { enterpriseId, reportId }, 'notification')
    }
}
