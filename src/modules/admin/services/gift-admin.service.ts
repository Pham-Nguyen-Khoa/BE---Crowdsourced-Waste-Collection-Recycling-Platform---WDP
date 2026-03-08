import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { CreateGiftDto } from '../dtos/create-gift.dto';

@Injectable()
export class GiftAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createGift(dto: CreateGiftDto) {
    return await (this.prisma as any).gift.create({
      data: dto,
    });
  }

  async getAllGifts() {
    return await (this.prisma as any).gift.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGiftStock(giftId: number, stock: number) {
    return await (this.prisma as any).gift.update({
      where: { id: giftId },
      data: { stock },
    });
  }

  async deleteGift(giftId: number) {
    return await (this.prisma as any).gift.update({
      where: { id: giftId },
      data: { isActive: false },
    });
  }

  async getAllRedemptions() {
    return await (this.prisma as any).redemption.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
        gift: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
