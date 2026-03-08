import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { CreateCollectorDto } from '../dtos/create-collector.dto';
import { hash } from 'bcrypt';
import { errorResponse, successResponse } from 'src/common/utils/response.util';

@Injectable()
export class CollectorService {
  private readonly DEFAULT_COLLECTOR_ROLE_ID = 3;
  private readonly logger = new Logger(CollectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCollector(enterpriseId: number, dto: CreateCollectorDto) {
    // 1. Uniqueness Checks for Email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail && !existingEmail.deletedAt) {
      return errorResponse(400, 'Email already exists', null);
    }

    // 2. Generate Unique Employee Code
    let employeeCode: string;
    let isCodeUnique = false;
    while (!isCodeUnique) {
      employeeCode = `COL-${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await this.prisma.collector.findFirst({
        where: { employeeCode, deletedAt: null },
      });
      if (!existing) isCodeUnique = true;
    }

    const isSoftDeletedUser = !!existingEmail?.deletedAt;
    const defaultPassword = await hash('Collector@123', 10);

    const collectorInclude = {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
        },
      },
      status: true,
    } as const;

    try {
      return await this.prisma.$transaction(async (tx) => {
        let userId: number;

        if (isSoftDeletedUser) {
          const reactivated = await tx.user.update({
            where: { id: existingEmail.id },
            data: {
              deletedAt: null,
              status: 'ACTIVE',
              password: defaultPassword,
              roleId: this.DEFAULT_COLLECTOR_ROLE_ID,
              fullName: dto.fullName,
              phone: dto.phone ?? null,
            },
          });
          userId = reactivated.id;
        } else {
          const newUser = await tx.user.create({
            data: {
              email: dto.email,
              password: defaultPassword,
              fullName: dto.fullName,
              phone: dto.phone ?? null,
              roleId: this.DEFAULT_COLLECTOR_ROLE_ID,
              status: 'ACTIVE',
            },
          });
          userId = newUser.id;
        }

        const existingCollector = await tx.collector.findFirst({
          where: { userId },
        });

        if (existingCollector) {
          const updated = await tx.collector.update({
            where: { id: existingCollector.id },
            data: {
              enterpriseId,
              employeeCode,
              workingHours: dto.workingHours,
              trustScore: 100,
              isActive: true,
              deletedAt: null,
            },
            include: collectorInclude,
          });

          await tx.collectorStatus.upsert({
            where: { collectorId: updated.id },
            create: {
              collectorId: updated.id,
              availability: 'OFFLINE',
              queueLength: 0,
            },
            update: {
              availability: 'OFFLINE',
              queueLength: 0,
            },
          });

          return successResponse(
            200,
            updated,
            'Collector reactivated successfully',
          );
        }

        const dataRes = await tx.collector.create({
          data: {
            userId,
            enterpriseId,
            employeeCode,
            workingHours: dto.workingHours,
            trustScore: 100,
            isActive: true,
            status: {
              create: {
                availability: 'OFFLINE',
                queueLength: 0,
              },
            },
          },
          include: collectorInclude,
        });
        return successResponse(200, dataRes, 'Collector created successfully');
      });
    } catch (error) {
      this.logger.error('Failed to create/reactivate collector', error);
      return errorResponse(500, 'Failed to create collector', error.message);
    }
  }
  async getProfile(collectorId: number) {
    const collector = await this.prisma.collector.findUnique({
      where: { id: collectorId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            avatar: true,
            balance: true,
          },
        },
        status: true,
        enterprise: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!collector) return errorResponse(404, 'Collector not found');

    return successResponse(200, collector, 'Get profile successfully');
  }

  async getAcceptedReports(collectorId: number) {
    const tasks = await this.prisma.collectorTaskAttempt.findMany({
      where: {
        collectorId,
        status: 'ACCEPTED',
      },
      include: {
        report: {
          include: {
            wasteItems: true,
            images: true,
            citizen: {
              select: {
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedTasks = tasks.map((task) => {
      const { wasteItems, ...reportRest } = task.report;

      const formattedWasteItems = wasteItems.map((item) => ({
        wasteType: item.wasteType,
        weightKg: item.weightKg ? Number(item.weightKg) : null,
      }));

      return {
        ...task,
        report: {
          ...reportRest,
          wasteItems: formattedWasteItems,
        },
      };
    });

    return successResponse(200, formattedTasks, 'Get accepted reports successfully');
  }

  async getAcceptedEnterprises(collectorId: number) {
    // Get enterprises that have reports accepted by this collector
    const enterprises = await this.prisma.enterprise.findMany({
      where: {
        reportAssignments: {
          some: {
            collectorId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
      },
    });

    return successResponse(
      200,
      enterprises,
      'Get accepted enterprises successfully',
    );
  }
}
