import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/libs/prisma/prisma.module';
import { ZoneService } from './services/zone.service';
import { ZoneController } from './controllers/zone.controller';
import { GeoService } from './services/geo.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ZoneController],
  providers: [ZoneService, GeoService],
  exports: [ZoneService, GeoService],
})
export class ZoneModule {}
