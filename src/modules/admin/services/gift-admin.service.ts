import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { CreateGiftDto } from '../dtos/create-gift.dto';
import { successResponse, errorResponse } from 'src/common/utils/response.util';
import { UpdateGiftDto } from '../dtos/update-gift.dto';

@Injectable()
export class GiftAdminService {
  constructor(private readonly prisma: PrismaService) { }

  async createGift(dto: CreateGiftDto, uploadedImageUrl?: string) {
    const finalImageUrl = uploadedImageUrl || dto.imageUrl || null;

    const gift = await this.prisma.gift.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        requiredPoints: dto.requiredPoints,
        stock: dto.stock,
        imageUrl: finalImageUrl,
        isActive: false
      },
    });

    return successResponse(200, gift, 'Tạo quà tặng mới thành công');
  }

  async getAllGifts() {
    const gifts = await this.prisma.gift.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(200, gifts, 'Lấy danh sách quà tặng thành công');
  }

  async updateGift(giftId: number, dto: UpdateGiftDto, uploadedImageUrl?: string) {
    const gift = await this.prisma.gift.findFirst({
      where: { id: giftId, deletedAt: null }
    });
    if (!gift) return errorResponse(400, 'Không tìm thấy quà tặng');

    const { image, imageUrl, ...updateData } = dto as any;
    const finalImageUrl = uploadedImageUrl || imageUrl || gift.imageUrl;

    const updated = await this.prisma.gift.update({
      where: { id: giftId },
      data: {
        ...updateData,
        imageUrl: finalImageUrl
      },
    });
    return successResponse(200, updated, 'Cập nhật quà tặng thành công');
  }

  async toggleActive(giftId: number) {
    const gift = await this.prisma.gift.findFirst({
      where: { id: giftId, deletedAt: null }
    });
    if (!gift) return errorResponse(400, 'Không tìm thấy quà tặng');

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

  async softDeleteGift(giftId: number) {
    const gift = await this.prisma.gift.findFirst({
      where: { id: giftId, deletedAt: null }
    });
    if (!gift) return errorResponse(400, 'Không tìm thấy quà tặng');

    await this.prisma.gift.update({
      where: { id: giftId },
      data: {
        deletedAt: new Date(),
        isActive: false
      },
    });
    return successResponse(200, null, 'Đã xóa quà tặng thành công');
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
    return successResponse(
      200,
      transactions,
      'Lấy lịch sử đổi quà thành công.',
    );
  }
}
