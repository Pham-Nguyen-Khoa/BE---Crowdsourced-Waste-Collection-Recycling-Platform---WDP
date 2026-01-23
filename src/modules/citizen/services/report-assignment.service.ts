import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { errorResponse, successResponse } from 'src/common/utils/response.util'

@Injectable()
export class ReportAssignmentService {
    private readonly logger = new Logger(ReportAssignmentService.name)

    constructor(private prisma: PrismaService) { }

    async enterpriseAccept(reportId: number, userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true }
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

        this.logger.log(`✅ Doanh nghiệp ${enterpriseId} đã chấp nhận báo cáo ${reportId}`)
        return successResponse(200, null, 'Doanh nghiep da chap nhan bao cao rac nay')

    }

    async enterpriseReject(reportId: number, userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true }
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

        this.logger.log(`❌ Doanh nghiệp ${enterpriseId} từ chối báo cáo ${reportId} - trạng thái trả về PENDING`)
        return successResponse(200, null, 'Doanh nghiep da tu choi bao cao rac nay  ')
    }

    async handleTimeoutAttempts(): Promise<void> {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

        const timeoutAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
            where: {
                status: 'WAITING',
                sentAt: { lt: tenMinutesAgo }
            },
            include: { report: true }
        })

        for (const attempt of timeoutAttempts) {
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

            this.logger.log(`⏰ Attempt ${attempt.id} hết thời gian - báo cáo ${attempt.reportId} trả về PENDING`)
        }
    }


}
