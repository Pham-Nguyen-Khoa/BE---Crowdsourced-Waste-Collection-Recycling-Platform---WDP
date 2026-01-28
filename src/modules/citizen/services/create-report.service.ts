import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { CreateReportMultipartDto, WasteItemDto } from '../dtos/create-report.dto'
import { CreateReportResponseDto } from '../dtos/create-report-response.dto'
import { SupabaseService } from 'src/modules/supabase/services/supabase.service'
import { CancelReportDto } from '../dtos/cancel-report.dto'
import { successResponse, errorResponse } from 'src/common/utils/response.util'

@Injectable()
export class CreateReportService {
  private readonly logger = new Logger(CreateReportService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) { }

  async createReport(data: CreateReportMultipartDto, citizenId: number, files?: Express.Multer.File[]): Promise<CreateReportResponseDto> {
    let uploadedImageUrls: string[] = []
    if (files && files.length > 0) {
      uploadedImageUrls = await this.supabaseService.uploadImages(files, 'reports')
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          citizenId,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          provinceCode: data.provinceCode,
          districtCode: data.districtCode,
          wardCode: data.wardCode,
          description: data.description,
        },
      })

      const wasteItems = data.wasteItems.map((item: WasteItemDto) => ({
        reportId: report.id,
        wasteType: item.wasteType,
        weightKg: item.weightKg,
      }))

      await tx.reportWaste.createMany({
        data: wasteItems,
      })

      if (uploadedImageUrls.length > 0) {
        const images = uploadedImageUrls.map((imageUrl: string) => ({
          reportId: report.id,
          imageUrl,
        }))
        await tx.reportImage.createMany({ data: images })
      }

      return report
    })


    this.logger.log(` Tạo báo cáo ${result.id} với trạng thái PENDING - chờ cron xử lý`)

    return {
      reportId: result.id,
      status: result.status,
      createdAt: result.createdAt,
    }
  }

  /**
   * Hủy báo cáo rác
   * QUY TẮC NGHIỆP VỤ:
   * - Chỉ chủ báo cáo (citizen) mới được hủy
   * - ĐƯỢC HỦY khi: PENDING, ACCEPTED, ASSIGNED
   * - KHÔNG ĐƯỢC HỦY khi: ON_THE_WAY, WAITING_CUSTOMER, COLLECTED, REJECTED, CANCELLED
   */
  async cancelReport(citizenId: number, reportId: number, dto: CancelReportDto) {
    try {
      // 1. Tìm report và kiểm tra quyền sở hữu
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: {
          assignment: true,
          reportEnterpriseAttempts: {
            where: { status: 'ACCEPTED' }
          }
        }
      })

      if (!report) {
        return errorResponse(404, 'Không tìm thấy báo cáo', 'REPORT_NOT_FOUND')
      }

      // 2. Kiểm tra report có thuộc về citizen không
      if (report.citizenId !== citizenId) {
        return errorResponse(403, 'Bạn không có quyền hủy báo cáo này', 'FORBIDDEN')
      }

      // 3. Các trạng thái KHÔNG được hủy
      const nonCancellableStatuses = ['ON_THE_WAY', 'WAITING_CUSTOMER', 'COLLECTED', 'REJECTED', 'CANCELLED']
      if (nonCancellableStatuses.includes(report.status)) {
        return errorResponse(
          400,
          `Không thể hủy báo cáo đang ở trạng thái "${report.status}".`,
          'CANNOT_CANCEL'
        )
      }

      // 4. Các trạng thái ĐƯỢC HỦY: PENDING, ACCEPTED, ASSIGNED
      const cancellableStatuses = ['PENDING', 'ACCEPTED', 'ASSIGNED']

      if (!cancellableStatuses.includes(report.status)) {
        return errorResponse(400, `Trạng thái "${report.status}" không cho phép hủy`, 'INVALID_STATUS')
      }

      // 5. Nếu đã ACCEPTED hoặc ASSIGNED → cần ROLLBACK
      if (['ACCEPTED', 'ASSIGNED'].includes(report.status)) {
        await this.rollbackAcceptedReport(report, dto.cancelReason)
      } else {
        // 6. Nếu PENDING → chỉ cần soft delete
        await this.prisma.report.update({
          where: { id: reportId },
          data: {
            deletedAt: new Date(),
            cancelReason: dto.cancelReason,
            status: 'CANCELLED',
          },
        })
      }

      this.logger.log(`Citizen ${citizenId} cancelled report ${reportId}. Status was: ${report.status}`)

      return successResponse(200, {
        reportId: reportId,
        status: 'CANCELLED',
        previousStatus: report.status,
        message: 'Hủy báo cáo thành công',
      }, 'Hủy báo cáo thành công')
    } catch (error) {
      this.logger.error(`Error cancelling report ${reportId}:`, error)
      return errorResponse(500, 'Lỗi khi hủy báo cáo', 'CANCEL_FAILED')
    }
  }

  /**
   * Rollback khi citizen hủy báo cáo đã được ACCEPTED/ASSIGNED
   */
  private async rollbackAcceptedReport(report: any, cancelReason?: string) {
    await this.prisma.$transaction(async (tx) => {
      // 1. Xóa assignment
      if (report.assignment) {
        await tx.reportAssignment.delete({
          where: { id: report.assignment.id }
        })
      }

      // 2. Cập nhật tất cả attempts của report này
      await tx.reportEnterpriseAttempt.updateMany({
        where: { reportId: report.id },
        data: {
          status: 'CANCELLED',
          respondedAt: new Date()
        }
      })

      // 3. Cập nhật report về CANCELLED
      await tx.report.update({
        where: { id: report.id },
        data: {
          deletedAt: new Date(),
          status: 'CANCELLED',
          currentEnterpriseId: null,
          cancelReason,
        }
      })

      // 4. Trừ điểm của citizen (nếu cần)
      // TODO: Quyết định có trừ điểm không khi hủy
    })
  }
}
