import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      // LOG NGAY LÚC KHỞI TẠO
      console.error('❌ DATABASE_URL is missing');
      throw new Error('DATABASE_URL is not defined');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.logger.log('🚀 PrismaService constructor initialized');
  }

  // NestJS hook – chạy khi module init xong
  async onModuleInit() {
    try {
      this.logger.log(`DB URL = ${process.env.DATABASE_URL}`);
      await this.$connect();
      this.logger.log('✅ Prisma connected to PostgreSQL successfully');
    } catch (error) {
      this.logger.error('❌ Prisma failed to connect to PostgreSQL', error);
      throw error;
    }
  }
}
