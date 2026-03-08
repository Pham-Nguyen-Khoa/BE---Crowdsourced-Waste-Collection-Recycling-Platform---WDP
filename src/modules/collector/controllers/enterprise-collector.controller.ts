import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { EnterpriseRoleGuard } from '../guards/enterprise-role.guard';
import { CollectorService } from '../services/collector.service';
import { GetUser } from 'src/modules/auth/guards/get-user.decorator';
import { GetCollectorsQueryDto } from '../dtos/get-collectors-query.dto';
import { UpdateCollectorDto } from '../dtos/update-collector.dto';
import { SupabaseService } from 'src/modules/supabase/services/supabase.service';

@ApiTags('Enterprise - Collector Management')
@ApiBearerAuth()
@UseGuards(JWTGuard, EnterpriseRoleGuard)
@Controller('api/v1/enterprise/collectors')
export class EnterpriseCollectorController {
  constructor(
    private readonly collectorService: CollectorService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách collector' })
  async getCollectors(
    @GetUser() user: any,
    @Query() query: GetCollectorsQueryDto,
  ) {
    return this.collectorService.getCollectors(user.enterpriseId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết collector' })
  async getCollectorById(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.collectorService.getCollectorById(user.enterpriseId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật collector' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateCollector(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollectorDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const urls = await this.supabaseService.uploadImages([file], 'avatars');
      dto.avatar = urls[0];
    }
    return this.collectorService.updateCollector(user.enterpriseId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa collector' })
  async deleteCollector(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.collectorService.deleteCollector(user.enterpriseId, id);
  }
}
