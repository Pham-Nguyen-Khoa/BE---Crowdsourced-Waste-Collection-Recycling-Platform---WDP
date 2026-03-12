import { Injectable } from '@nestjs/common';
import { Prisma, CollectorAvailability } from '@prisma/client';

@Injectable()
export class CollectorQueueService {
  /**
   * Tăng số lượng task trong hàng chờ của Collector
   */
  async increment(collectorId: number, tx: Prisma.TransactionClient) {
    const status = await tx.collectorStatus.findUnique({
      where: { collectorId },
      select: { queueLength: true, availability: true },
    });

    if (!status) return;

    const newQueueLength = status.queueLength + 1;
    let targetAvailability = status.availability;

    // Nếu đang ONLINE (AVAILABLE hoặc BUSY), chuyển sang BUSY vì đã có ít nhất 1 task
    if (status.availability !== CollectorAvailability.OFFLINE) {
      targetAvailability = CollectorAvailability.ONLINE_BUSY;
    }

    return await tx.collectorStatus.update({
      where: { collectorId },
      data: {
        queueLength: newQueueLength,
        availability: targetAvailability,
      },
    });
  }

  /**
   * Giảm số lượng task trong hàng chờ của Collector
   * Safeguard: Không cho phép queueLength xuống dưới 0 sau khi cập nhật
   */
  async decrement(collectorId: number, tx: Prisma.TransactionClient) {
    // 1. Lấy trạng thái hiện tại để biết queueLength
    const status = await tx.collectorStatus.findUnique({
      where: { collectorId },
      select: { queueLength: true, availability: true },
    });

    if (!status) return;

    // Tính toán queueLength mới (không nhỏ hơn 0)
    const newQueueLength = Math.max(0, status.queueLength - 1);

    // 2. Cập nhật đồng thời queueLength và availability
    // Nếu queueLength mới = 0, ép trạng thái về ONLINE_AVAILABLE (nếu đang ONLINE)
    let targetAvailability = status.availability;
    if (status.availability !== CollectorAvailability.OFFLINE) {
      targetAvailability =
        newQueueLength >= 1
          ? CollectorAvailability.ONLINE_BUSY
          : CollectorAvailability.ONLINE_AVAILABLE;
    }

    const result = await tx.collectorStatus.update({
      where: { collectorId },
      data: {
        queueLength: newQueueLength,
        availability: targetAvailability,
      },
    });

    return result;
  }

  /**
   * Đồng bộ trạng thái dựa trên queueLength hiện tại
   * Dùng để sửa lỗi khi trạng thái bị lệch hoặc gọi sau các thao tác khác
   */
  async syncAvailability(
    collectorId: number,
    tx: Prisma.TransactionClient,
  ) {
    const status = await tx.collectorStatus.findUnique({
      where: { collectorId },
      select: { queueLength: true, availability: true },
    });

    if (!status || status.availability === CollectorAvailability.OFFLINE) {
      return;
    }

    const targetAvailability =
      status.queueLength >= 1
        ? CollectorAvailability.ONLINE_BUSY
        : CollectorAvailability.ONLINE_AVAILABLE;

    if (status.availability !== targetAvailability) {
      return await tx.collectorStatus.update({
        where: { collectorId },
        data: { availability: targetAvailability },
      });
    }
  }
}
