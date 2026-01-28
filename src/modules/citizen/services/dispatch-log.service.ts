import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { successResponse } from 'src/common/utils/response.util';

@Injectable()
export class DispatchLogService {
  private readonly logger = new Logger(DispatchLogService.name)

  constructor(private prisma: PrismaService) { }

  async create(payload: { level: string; message: string; meta?: any }) {
    try {
      const record = await (this.prisma as any).dispatchLog.create({
        data: {
          level: payload.level,
          message: payload.message,
          meta: payload.meta || null
        }
      })
      return record
    } catch (error) {
      this.logger.error('Failed to create dispatch log', error)
      return null
    }
  }

  async findAll(options: {
    page?: number
    limit?: number
    level?: string
    query?: string
  }) {
    const page = options.page && options.page > 0 ? options.page : 1
    const limit = options.limit && options.limit > 0 ? options.limit : 20
    const where: any = {}

    if (options.level) {
      where.level = options.level
    }

    if (options.query) {
      where.message = { contains: options.query, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).dispatchLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      (this.prisma as any).dispatchLog.count({ where })
    ])

    return successResponse(200, { data, total, page, limit }, 'Lấy log thành công')
  }

  async findById(id: number) {
    return await (this.prisma as any).dispatchLog.findUnique({ where: { id } })
  }
}


