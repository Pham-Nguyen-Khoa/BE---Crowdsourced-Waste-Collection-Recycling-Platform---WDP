import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/libs/prisma/prisma.service'
import { ReportDispatcherService } from './report-dispatcher.service'

@Injectable()
export class ReportCronService {
    private readonly logger = new Logger(ReportCronService.name)

    constructor(
        private prisma: PrismaService,
        private reportDispatcher: ReportDispatcherService
    ) {}

    /**
     * 🔁 CRON #1 — Dispatch retry (MỖI PHÚT)
     *
     * 📌 Mục tiêu: "Có report PENDING nào chưa gán được DN không?"
     * 📌 Điều kiện:
     *   - status = PENDING
     *   - currentEnterpriseId IS NULL
     *   - deletedAt IS NULL
     * 📌 Cron: Chạy mỗi 1 phút
     * 📌 Ý nghĩa: Report mới, bị reject hết DN cũ, DN online sau giờ nghỉ
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleDispatchRetry() {
        this.logger.log('🔄 Starting dispatch retry cron job')

        try {
            // Tìm reports cần dispatch
            const pendingReports = await this.prisma.report.findMany({
                where: {
                    status: 'PENDING',
                    currentEnterpriseId: null,
                    deletedAt: null
                },
                select: { id: true }
            })

            if (pendingReports.length === 0) {
                this.logger.log('✅ No pending reports need dispatching')
                return
            }

            this.logger.log(`📋 Found ${pendingReports.length} reports to dispatch`)

            // Dispatch từng report
            let successCount = 0
            for (const report of pendingReports) {
                try {
                    await this.reportDispatcher.dispatch(report.id)
                    successCount++
                    // Thêm delay nhỏ để tránh spam DB
                    await new Promise(resolve => setTimeout(resolve, 100))
                } catch (error) {
                    this.logger.error(`❌ Failed to dispatch report ${report.id}:`, error.message)
                }
            }

            this.logger.log(`✅ Dispatch retry completed: ${successCount}/${pendingReports.length} reports dispatched`)

        } catch (error) {
            this.logger.error('💥 Dispatch retry cron job failed:', error)
        }
    }

    /**
     * ⏱ CRON #2 — Timeout DN không phản hồi (10 PHÚT)
     *
     * 📌 Mục tiêu: DN đã nhận report nhưng không accept/reject
     * 📌 Điều kiện:
     *   - status = PENDING
     *   - currentEnterpriseId IS NOT NULL
     *   - sentAt < now - 10 minutes
     * 📌 Xử lý:
     *   - Add DN vào ReportRejectedEnterprise
     *   - Clear currentEnterpriseId
     *   - Để cron #1 dispatch tiếp
     */
    @Cron('0 */10 * * * *') // Chạy mỗi 10 phút
    async handleEnterpriseTimeout() {
        this.logger.log('⏰ Starting enterprise timeout cron job')

        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

            // Tìm reports bị timeout
            const timeoutReports = await this.prisma.report.findMany({
                where: {
                    status: 'PENDING',
                    currentEnterpriseId: { not: null },
                    sentAt: { lt: tenMinutesAgo },
                    deletedAt: null
                },
                select: {
                    id: true,
                    currentEnterpriseId: true
                }
            })

            if (timeoutReports.length === 0) {
                this.logger.log('✅ No timeout reports found')
                return
            }

            this.logger.log(`⏰ Found ${timeoutReports.length} timeout reports to process`)

            let processedCount = 0
            for (const report of timeoutReports) {
                try {
                    // Add enterprise vào rejected list
                    await this.prisma.reportRejectedEnterprise.upsert({
                        where: {
                            reportId_enterpriseId: {
                                reportId: report.id,
                                enterpriseId: report.currentEnterpriseId!
                            }
                        },
                        update: { rejectedAt: new Date() },
                        create: {
                            reportId: report.id,
                            enterpriseId: report.currentEnterpriseId!
                        }
                    })

                    // Clear currentEnterpriseId và sentAt
                    await this.prisma.report.update({
                        where: { id: report.id },
                        data: {
                            currentEnterpriseId: null,
                            sentAt: null
                        }
                    })

                    processedCount++
                    this.logger.log(`✅ Processed timeout for report ${report.id}, enterprise ${report.currentEnterpriseId}`)

                } catch (error) {
                    this.logger.error(`❌ Failed to process timeout for report ${report.id}:`, error.message)
                }
            }

            this.logger.log(`✅ Enterprise timeout cron completed: ${processedCount}/${timeoutReports.length} reports processed`)

        } catch (error) {
            this.logger.error('💥 Enterprise timeout cron job failed:', error)
        }
    }
}
