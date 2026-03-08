import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { EnterpriseRoleGuard } from 'src/modules/collector/guards/enterprise-role.guard';
import { GetUser } from 'src/modules/auth/guards/get-user.decorator';
import { ZoneService } from '../services/zone.service';
import { CreateZoneDto } from '../dtos/create-zone.dto';
import { UpdateZoneDto } from '../dtos/update-zone.dto';

@ApiTags('Zones')
@ApiBearerAuth()
@UseGuards(JWTGuard, EnterpriseRoleGuard)
@Controller('zones')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dispatch zone' })
  create(@GetUser() user: any, @Body() dto: CreateZoneDto) {
    return this.zoneService.createZone(user.enterpriseId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active zones for the enterprise' })
  findAll(@GetUser() user: any) {
    return this.zoneService.getZones(user.enterpriseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get zone details' })
  findOne(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.zoneService.getZoneDetail(user.enterpriseId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update zone details' })
  update(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.zoneService.updateZone(user.enterpriseId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a zone (soft delete)' })
  remove(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.zoneService.deleteZone(user.enterpriseId, id);
  }

  @Post('revalidate')
  @ApiOperation({ summary: 'Revalidate zones against current service areas' })
  revalidate(@GetUser() user: any) {
    return this.zoneService.revalidateZones(user.enterpriseId);
  }
}
