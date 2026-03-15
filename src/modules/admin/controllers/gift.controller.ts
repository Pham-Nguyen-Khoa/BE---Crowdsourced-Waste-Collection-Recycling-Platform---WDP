import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { GiftAdminService } from '../services/gift-admin.service';
import { CreateGiftDto } from '../dtos/create-gift.dto';
import { UpdateGiftDto } from '../dtos/update-gift.dto';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { routesV1 } from '../../../configs/app.routes';
import { SupabaseService } from '../../supabase/services/supabase.service';

@ApiTags('Admin Gift Management')
@Controller(routesV1.apiversion + '/admin/gifts')
@UseGuards(JWTGuard, RolesGuard)
@Roles(4) // Admin Role ID
@ApiBearerAuth()
export class GiftController {
  constructor(
    private readonly giftService: GiftAdminService,
    private readonly supabaseService: SupabaseService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Tạo quà tặng mới' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Voucher VinMart 50k' },
        type: {
          type: 'string',
          enum: ['FOOD', 'SHOPPING', 'OTHER'],
          example: 'SHOPPING',
          description: 'Phân loại quà tặng'
        },
        requiredPoints: { type: 'number', example: 500 },
        stock: { type: 'number', example: 100 },

        description: {
          type: 'string',
          example: 'Dùng để mua hàng tại VinMart',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh quà tặng',
        },
      },
      required: ['name', 'type', 'requiredPoints', 'stock'],
    },
  })
  async createGift(
    @Body() dto: CreateGiftDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl = dto.imageUrl;
    if (file) {
      const urls = await this.supabaseService.uploadImages([file], 'gifts');
      imageUrl = urls[0];
    }
    return await this.giftService.createGift(dto, imageUrl);
  }

  @Get()
  @ApiOperation({ summary: 'Xem tất cả quà tặng' })
  async getAllGifts() {
    return await this.giftService.getAllGifts();
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Bật/Tắt quà tặng' })
  async toggleActive(@Param('id') id: string) {
    return await this.giftService.toggleActive(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin quà tặng' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        requiredPoints: { type: 'number' },
        stock: { type: 'number' },
        type: {
          type: 'string',
          enum: ['FOOD', 'SHOPPING', 'OTHER'],
          example: 'SHOPPING'
        },
        isActive: { type: 'boolean' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh quà tặng mới',
        },
      },
    },
  })
  async updateGift(
    @Param('id') id: string,
    @Body() dto: UpdateGiftDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl = dto.imageUrl;
    if (file) {
      const urls = await this.supabaseService.uploadImages([file], 'gifts');
      imageUrl = urls[0];
    }
    return await this.giftService.updateGift(+id, dto, imageUrl);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa quà tặng (Xóa mềm)' })
  async softDeleteGift(@Param('id') id: string) {
    return await this.giftService.softDeleteGift(+id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Xem lịch sử đổi quà (Admin)' })
  async getAllRedemptions() {
    return await this.giftService.getAllRedemptions();
  }
}
