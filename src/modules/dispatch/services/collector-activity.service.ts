import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CollectorActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cập nhật thời điểm hoạt động cuối cùng của Collector
   * Dùng để duy trì trạng thái "Online" (active < 5 phút)
   */
  async touch(collectorId: number, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    return client.collectorStatus.update({
      where: { collectorId },
      data: {
        lastActivityAt: new Date(),
      },
    });
  }
}
