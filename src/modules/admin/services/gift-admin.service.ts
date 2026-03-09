import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { CreateGiftDto } from '../dtos/create-gift.dto';
import {
  successResponse,
  errorResponse,
} from 'src/common/utils/response.util';

@Injectable()
export class GiftAdminService {
  constructor(private readonly prisma: PrismaService) { }

  async createGift(dto: CreateGiftDto) {
    const gift = await this.prisma.gift.create({
      data: dto,
    });
    return successResponse(200, gift, 'Tạo quà tặng mới thành công');
  }

  async getAllGifts() {
    const gifts = await this.prisma.gift.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(200, gifts, 'Lấy danh sách quà tặng thành công');
  }

  async updateGift(giftId: number, dto: any) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) errorResponse(400, 'Không tìm thấy quà tặng');

    const updated = await this.prisma.gift.update({
      where: { id: giftId },
      data: dto,
    });
    return successResponse(200, updated, 'Cập nhật quà tặng thành công');
  }

  async deleteGift(giftId: number) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) errorResponse(400, 'Không tìm thấy quà tặng');

    const updated = await this.prisma.gift.update({
      where: { id: giftId },
      data: { isActive: !gift.isActive },
    });
    return successResponse(
      200,
      updated,
      updated.isActive ? 'Đã mở khóa quà tặng' : 'Đã khóa quà tặng',
    );
  }

  async getAllRedemptions() {
    const transactions = await this.prisma.pointTransaction.findMany({
      where: {
        giftId: { not: null },
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        gift: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(200, transactions, 'Lấy lịch sử đổi quà thành công');
  }
}
