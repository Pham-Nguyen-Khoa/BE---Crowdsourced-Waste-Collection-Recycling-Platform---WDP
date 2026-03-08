import { Injectable } from '@nestjs/common';
import { Prisma, CollectorAvailability } from '@prisma/client';

@Injectable()
export class CollectorQueueService {
  /**
   * Tăng số lượng task trong hàng chờ của Collector
   */
  async increment(collectorId: number, tx: Prisma.TransactionClient) {
    const result = await tx.collectorStatus.update({
      where: { collectorId },
      data: {
        queueLength: { increment: 1 },
      },
    });

    await this.syncAvailability(collectorId, result.queueLength, tx);
    return result;
  }

  /**
   * Giảm số lượng task trong hàng chờ của Collector
   * Safeguard: Không cho phép queueLength xuống dưới 0
   */
  async decrement(collectorId: number, tx: Prisma.TransactionClient) {
    // 1. Kiểm tra trạng thái hiện tại để tránh queueLength âm
    const status = await tx.collectorStatus.findUnique({
      where: { collectorId },
      select: { queueLength: true, availability: true },
    });

    if (!status || status.queueLength <= 0) {
      return;
    }

    const newQueueLength = status.queueLength - 1;
    const result = await tx.collectorStatus.update({
      where: { collectorId },
      data: {
        queueLength: newQueueLength,
      },
    });

    await this.syncAvailability(collectorId, newQueueLength, tx);
    return result;
  }

  /**
   * Đồng bộ trạng thái ONLINE_AVAILABLE / ONLINE_BUSY dựa trên queueLength
   */
  private async syncAvailability(
    collectorId: number,
    queueLength: number,
    tx: Prisma.TransactionClient,
  ) {
    const status = await tx.collectorStatus.findUnique({
      where: { collectorId },
      select: { availability: true },
    });

    if (!status || status.availability === CollectorAvailability.OFFLINE) {
      return;
    }

    const targetAvailability =
      queueLength >= 1
        ? CollectorAvailability.ONLINE_BUSY
        : CollectorAvailability.ONLINE_AVAILABLE;

    if (status.availability !== targetAvailability) {
      await tx.collectorStatus.update({
        where: { collectorId },
        data: { availability: targetAvailability },
      });
    }
  }
}
