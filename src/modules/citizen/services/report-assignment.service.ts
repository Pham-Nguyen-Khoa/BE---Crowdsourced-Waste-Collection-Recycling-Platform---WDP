import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { errorResponse, successResponse } from 'src/common/utils/response.util'
import { NotificationGateway } from '../../notification/gateways/notification.gateway'
import { NotificationType } from '@prisma/client'

@Injectable()
export class ReportAssignmentService {
    private readonly logger = new Logger(ReportAssignmentService.name)

    constructor(
        private prisma: PrismaService,
        private notificationGateway: NotificationGateway
    ) { }

    async enterpriseAccept(reportId: number, userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true, name: true }
        })

        if (!enterprise) {
            return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep')
        }

        const enterpriseId = enterprise.id

        const attempt = await this.prisma.reportEnterpriseAttempt.findUnique({
            where: {
                reportId_enterpriseId: { reportId, enterpriseId }
            }
        })

        if (!attempt || attempt.status !== 'WAITING') {
            return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep')
        }

        // Lấy thông tin báo cáo và chủ sở hữu (citizen)
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            select: {
                citizenId: true,
                deletedAt: true,
                status: true
            }
        })

        if (!report) {
            return errorResponse(400, 'Báo cáo không tồn tại')
        }

        // ✅ KIỂM TRA: Report đã bị hủy chưa
        if (report.deletedAt) {
            return errorResponse(400, 'Báo cáo đã bị hủy bởi citizen', 'REPORT_CANCELLED')
        }

        // ✅ KIỂM TRA: Report còn ở trạng thái PENDING không
        if (report.status !== 'PENDING') {
            return errorResponse(400, `Báo cáo đang ở trạng thái "${report.status}", không thể chấp nhận`, 'INVALID_STATUS')
        }

        await this.prisma.reportEnterpriseAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'ACCEPTED',
                respondedAt: new Date()
            }
        })

        await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: 'ACCEPTED',
                currentEnterpriseId: enterpriseId
            }
        })

        await this.prisma.reportAssignment.create({
            data: {
                reportId,
                enterpriseId
            }
        })

        await this.prisma.reportEnterpriseAttempt.updateMany({
            where: {
                reportId,
                id: { not: attempt.id },
                status: 'WAITING'
            },
            data: {
                status: 'EXPIRED',
                respondedAt: new Date()
            }
        })

        if (report.citizenId) {
            const notification = await this.prisma.notification.create({
                data: {
                    userId: report.citizenId,
                    type: NotificationType.REPORT_STATUS_CHANGED,
                    title: 'Báo cáo đã được tiếp nhận',
                    content: 'Báo cáo của bạn đã được tiếp nhận và sẽ sớm được xử lý.',
                    meta: { reportId, action: 'ACCEPTED' }
                }
            })

            // Gửi qua socket
            this.notificationGateway.notifyUser(report.citizenId, {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                content: notification.content,
                meta: notification.meta,
                createdAt: notification.createdAt
            })

            this.logger.log(`📬 Đã gửi notification cho citizen ${report.citizenId}`)
        }

        this.logger.log(`✅ Doanh nghiệp ${enterpriseId} đã chấp nhận báo cáo ${reportId}`)
        return successResponse(200, null, 'Doanh nghiep da chap nhan bao cao rac nay')

    }

    async enterpriseReject(reportId: number, userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true, name: true }
        })

        if (!enterprise) {
            return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep')
        }

        const enterpriseId = enterprise.id

        const attempt = await this.prisma.reportEnterpriseAttempt.findUnique({
            where: {
                reportId_enterpriseId: { reportId, enterpriseId }
            }
        })

        if (!attempt || attempt.status !== 'WAITING') {
            return errorResponse(400, 'Ban khong co quyen phan tich bao cao')
        }

        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            select: { deletedAt: true, status: true }
        })

        if (report?.deletedAt) {
            return errorResponse(400, 'Báo cáo đã bị hủy bởi citizen', 'REPORT_CANCELLED')
        }

        await this.prisma.reportEnterpriseAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'REJECTED',
                respondedAt: new Date()
            }
        })

        await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: 'PENDING',
                currentEnterpriseId: null
            }
        })


        return successResponse(200, null, 'Doanh nghiep da tu choi bao cao rac nay  ')
    }

    async handleTimeoutAttempts(): Promise<void> {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

        const timeoutAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
            where: {
                status: 'WAITING',
                sentAt: { lt: tenMinutesAgo }
            },
            include: {
                report: {
                    include: {
                        citizen: {
                            select: { id: true }
                        }
                    }
                }
            }
        })

        for (const attempt of timeoutAttempts) {
            // Skip nếu report đã bị hủy
            if (!attempt.report || attempt.report.deletedAt) {
                this.logger.log(`⏰ Attempt ${attempt.id} thuộc report đã bị hủy, bỏ qua`)
                continue
            }

            await this.prisma.reportEnterpriseAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: 'EXPIRED',
                    respondedAt: new Date()
                }
            })

            await this.prisma.report.update({
                where: { id: attempt.reportId },
                data: {
                    status: 'PENDING',
                    currentEnterpriseId: null
                }
            })

            // Gửi notification hết hạn
            // if (attempt.report?.citizen?.id) {
            //     const notification = await this.prisma.notification.create({
            //         data: {
            //             userId: attempt.report.citizen.id,
            //             type: NotificationType.REPORT_STATUS_CHANGED,
            //             title: 'Báo cáo đã hết thời gian phản hồi',
            //             content: 'Không có doanh nghiệp nào chấp nhận báo cáo của bạn. Vui lòng tạo lại báo cáo.',
            //             meta: { reportId: attempt.reportId, action: 'EXPIRED' }
            //         }
            //     })

            //     this.notificationGateway.notifyUser(attempt.report.citizen.id, {
            //         id: notification.id,
            //         type: notification.type,
            //         title: notification.title,
            //         content: notification.content,
            //         meta: notification.meta,
            //         createdAt: notification.createdAt
            //     })
            // }

            this.logger.log(`⏰ Attempt ${attempt.id} hết thời gian - báo cáo ${attempt.reportId} trả về PENDING`)
        }
    }

    async getAllWaitingReports(userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true }
        })

        if (!enterprise) {
            return errorResponse(400, 'Ban khong co quyen truy cap doanh nghiep')
        }

        const enterpriseId = enterprise.id

        const waitingAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
            where: {
                enterpriseId,
                status: 'WAITING'
            },
            include: {
                report: {
                    include: {
                        citizen: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                                email: true
                            }
                        },
                    }
                }
            },
            orderBy: {
                sentAt: 'desc'
            }
        })

        const reports = waitingAttempts.map(attempt => ({
            ...attempt.report,
            sentAt: attempt.sentAt,
            attemptId: attempt.id
        }))

        this.logger.log(`📋 Doanh nghiệp ${enterpriseId} lấy ${reports.length} báo cáo đang đợi phản hồi`)

        return successResponse(200, reports, `Lay thanh cong ${reports.length} bao cao dang doi phan hoi`)
    }


}
