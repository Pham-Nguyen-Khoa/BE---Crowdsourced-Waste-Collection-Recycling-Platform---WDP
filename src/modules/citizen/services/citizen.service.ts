import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { SupabaseService } from '../../supabase/services/supabase.service'
import { ReportDispatcherService } from './report-dispatcher.service'
import { CreateReportMultipartDto, WasteItemDto } from '../dtos/create-report.dto'
import { CreateReportResponseDto } from '../dtos/create-report-response.dto'
import { ReportDispatchResponseDto } from '../dtos/report-dispatch-response.dto'
import { EnterpriseResponseDto, EnterpriseResponseResponseDto } from '../dtos/enterprise-response.dto'
import { ReportStatus } from '@prisma/client'

@Injectable()
export class CitizenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly reportDispatcher: ReportDispatcherService,
  ) { }

  async createReport(data: CreateReportMultipartDto, citizenId: number, files?: Express.Multer.File[]): Promise<CreateReportResponseDto> {

    let uploadedImageUrls: string[] = []
    if (files && files.length > 0) {
      try {
        uploadedImageUrls = await this.supabaseService.uploadImages(files, 'reports')
      } catch (error) {
        throw new BadRequestException('Failed to upload images')
      }
    }

    const allImageUrls = [...uploadedImageUrls]

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

      if (allImageUrls.length > 0) {
        const images = allImageUrls.map((imageUrl: string) => ({
          reportId: report.id,
          imageUrl,
        }))

        await tx.reportImage.createMany({
          data: images,
        })
      }

      return report
    })

    this.reportDispatcher.dispatch(result.id)
      .catch(error => {
        Logger.error(
          `Dispatch failed for report ${result.id}, cron will retry`,
          error
        )
      })

    return {
      reportId: result.id,
      status: result.status,
      createdAt: result.createdAt,
    }
  }

  /**
   * Xử lý phản hồi từ doanh nghiệp (accept/reject report)
   */
  // async handleEnterpriseResponse(
  //   data: EnterpriseResponseDto,
  //   userId: number
  // ): Promise<EnterpriseResponseResponseDto> {
  //   try {
  //     // Kiểm tra quyền: user phải thuộc enterprise
  //     const enterprise = await this.prisma.enterprise.findFirst({
  //       where: {
  //         id: data.enterpriseId,
  //         userId,
  //         status: 'ACTIVE'
  //       }
  //     });

  //     if (!enterprise) {
  //       throw new BadRequestException('Unauthorized: You do not have permission to respond to this report');
  //     }

  //     // Kiểm tra report có đang được assign cho enterprise này không
  //     const assignment = await this.prisma.reportAssignment.findFirst({
  //       where: {
  //         reportId: data.reportId,
  //         enterpriseId: data.enterpriseId,
  //         completedAt: null // Chưa hoàn thành
  //       },
  //       include: {
  //         report: true
  //       }
  //     });

  //     if (!assignment) {
  //       throw new BadRequestException('Report not assigned to this enterprise');
  //     }

  //     if (assignment.report.status !== 'PENDING') {
  //       throw new BadRequestException('Report is no longer pending');
  //     }

  //     // Xử lý phản hồi
  //     await this.reportScheduler.handleEnterpriseResponse(
  //       data.reportId,
  //       data.enterpriseId,
  //       data.accepted,
  //       data.notes
  //     );

  //     return {
  //       success: true,
  //       message: data.accepted ? 'Report accepted successfully' : 'Report rejected',
  //       reportId: data.reportId,
  //       status: data.accepted ? 'ACCEPTED' : 'REJECTED'
  //     };

  //   } catch (error) {
  //     if (error instanceof BadRequestException) {
  //       throw error;
  //     }
  //     throw new BadRequestException('Failed to process enterprise response');
  //   }
  // }

}
