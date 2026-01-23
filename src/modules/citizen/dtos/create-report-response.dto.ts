import { ApiProperty } from "@nestjs/swagger"
import { ReportStatus } from "generated/prisma/enums"

export class CreateReportResponseDto {
  @ApiProperty({
    example: 123,
    description: 'ID của report'
  })
  reportId: number

  @ApiProperty({
    example: 'PENDING',
    description: 'Trạng thái của report',
    enum: ReportStatus
  })
  status: ReportStatus

  @ApiProperty({
    example: '2024-01-20T10:30:00.000Z',
    description: 'Thời gian tạo report'
  })
  createdAt: Date
}
