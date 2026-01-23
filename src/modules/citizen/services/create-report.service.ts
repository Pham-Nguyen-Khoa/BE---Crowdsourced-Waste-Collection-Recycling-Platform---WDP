import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { CreateReportMultipartDto, WasteItemDto } from '../dtos/create-report.dto'
import { CreateReportResponseDto } from '../dtos/create-report-response.dto'
import { SupabaseService } from 'src/modules/supabase/services/supabase.service'

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



}
