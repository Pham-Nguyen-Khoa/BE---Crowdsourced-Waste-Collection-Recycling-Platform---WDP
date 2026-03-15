import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/guards/roles.decorator';
import { errorResponse, successResponse } from 'src/common/utils/response.util';
import { routesV1 } from 'src/configs/app.routes';

@ApiTags('Admin - Violations')
@Controller(routesV1.apiversion + '/admin/violations')
@UseGuards(JWTGuard, RolesGuard)
@Roles(4)
@ApiBearerAuth()
export class AdminViolationsController {
  constructor(private readonly prisma: PrismaService) { }

  @Get('fake-reports')
  @ApiOperation({ summary: 'Xem danh sách user vi phạm reportFake' })
  async getFakeReportViolators(@Query() query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const violators = await this.prisma.user.findMany({
      where: {
        reportedFakes: {
          some: {},
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatar: true,
        _count: {
          select: {
            reportedFakes: true,
          },
        },
      },
      skip,
      take: +limit,
      orderBy: {
        reportedFakes: {
          _count: 'desc',
        },
      },
    });

    const total = await this.prisma.user.count({
      where: {
        reportedFakes: {
          some: {},
        },
      },
    });

    return successResponse(
      200,
      {
        data: violators.map((v) => ({
          userId: v.id,
          fullName: v.fullName,
          email: v.email,
          avatar: v.avatar,
          violationCount: v._count.reportedFakes,
        })),
        meta: { total, page: +page, limit: +limit },
      },
      'Lấy danh sách vi phạm thành công',
    );
  }

  @Get('fake-reports/:userId')
  @ApiOperation({ summary: 'Xem chi tiết các lần vi phạm của một user' })
  async getViolatorDetails(@Param('userId') userId: string) {
    const logs = await this.prisma.reportFakeLog.findMany({
      where: { violatorId: +userId },
      include: {
        report: {
          include: {
            images: true,
            wasteItems: true,
          },
        },
        reporter: {
          select: {
            fullName: true,
            email: true,
            avatar: true,
            role: { select: { name: true } },
            collector: {
              select: {
                employeeCode: true,
                enterprise: { select: { name: true } }
              }
            }
          },
        },
        violator: {
          select: {
            fullName: true,
            email: true,
            avatar: true,
            role: { select: { name: true } },
            collector: {
              select: {
                employeeCode: true,
                enterprise: { select: { name: true } }
              }
            },
            enterprise: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      collectorReason: log.reason,
      collectorEvidence: log.images,
      reporter: {
        fullName: log.reporter.fullName,
        email: log.reporter.email,
        avatar: log.reporter.avatar,
        role: log.reporter.role.name,
        employeeCode: log.reporter.collector?.employeeCode,
        enterpriseName: log.reporter.collector?.enterprise?.name || 'N/A'
      },
      violator: {
        fullName: log.violator.fullName,
        email: log.violator.email,
        avatar: log.violator.avatar,
        role: log.violator.role.name,
        enterpriseName: log.violator.enterprise?.name || log.violator.collector?.enterprise?.name || 'Cá nhân'
      },
      originalReport: {
        id: log.report.id,
        address: log.report.address,
        citizenDescription: log.report.description,
        citizenImages: log.report.images.map((img) => img.imageUrl),
        estimatedWaste: log.report.wasteItems.map((item) => ({
          type: item.wasteType,
          weight: item.weightKg,
        })),
        status: log.report.status,
      },
    }));

    return successResponse(
      200,
      formattedLogs,
      'Lấy chi tiết vi phạm thành công',
    );
  }

  @ApiOperation({ summary: 'Khóa tài khoản user vi phạm' })
  @Get('ban/:userId')
  async banUser(@Param('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: +userId },
      include: { role: true }
    });

    if (!user) {
      return errorResponse(404, 'Không tìm thấy người dùng');
    }

    if (user.roleId === 4) {
      return errorResponse(400, 'Không thể khóa tài khoản quản trị viên');
    }

    if (user.status === 'BANNED') {
      return errorResponse(400, 'Tài khoản này đã bị khóa từ trước');
    }

    await this.prisma.user.update({
      where: { id: +userId },
      data: { status: 'BANNED' }
    });
    return successResponse(200, null, `Đã khóa tài khoản ${user.fullName} thành công`);
  }
}
