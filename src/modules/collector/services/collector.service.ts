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
import { MailerService } from 'src/modules/auth/mail/mailer.service';

@Injectable()
export class CollectorService {
  private readonly DEFAULT_COLLECTOR_ROLE_ID = 3;
  private readonly logger = new Logger(CollectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  private async sendCollectorAccountEmail(
    email: string,
    fullName: string,
    rawPassword: string,
    enterpriseName: string,
  ) {
    const subject = 'Thông tin tài khoản người thu gom của bạn';
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông tin tài khoản người thu gom</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        td {
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #4CAF50;
            padding: 35px 35px;
            text-align: center;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 35px;
            color: #333333;
            line-height: 1.6;
        }
        .content p {
            margin: 0 0 15px;
            font-size: 15px;
        }
        .content strong {
            color: #222222;
        }
        .credentials-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            background-color: #f9f9f9;
            border: 1px solid #eeeeee;
            border-radius: 6px;
        }
        .credentials-table th, .credentials-table td {
            padding: 15px 20px;
            text-align: left;
            border-bottom: 1px solid #eeeeee;
            font-size: 15px;
        }
        .credentials-table th {
            background-color: #e8e8e8;
            color: #555555;
            font-weight: 600;
            width: 30%;
        }
        .credentials-table td {
            color: #333333;
            font-weight: 500;
        }
        .credentials-table tr:last-child td {
            border-bottom: none;
        }
        .warning {
            background-color: #fff8e1;
            border-left: 4px solid #ffc107;
            padding: 18px 20px;
            border-radius: 6px;
            margin: 25px 0;
        }
        .warning p {
            margin: 0;
            color: #f57c00;
            font-size: 14px;
            line-height: 1.5;
        }
        .cta-button {
            display: inline-block;
            padding: 14px 35px;
            background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
            color: #ffffff;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            border-radius: 8px;
            margin-top: 30px;
        }
        .footer {
            background-color: #f5f5f5;
            padding: 30px 35px;
            text-align: center;
            border-top: 1px solid #eeeeee;
            color: #888888;
            font-size: 14px;
        }
        .footer p {
            margin: 0 0 10px;
        }
    </style>
</head>
<body>
    <table role="presentation" class="container">
        <tr>
            <td>
                <!-- Header -->
                <table role="presentation" class="header">
                    <tr>
                        <td>
                            <h1>Chào mừng bạn đến với ${enterpriseName}!</h1>
                        </td>
                    </tr>
                </table>

                <!-- Content -->
                <table role="presentation" class="content">
                    <tr>
                        <td>
                            <p>Xin chào <strong>${fullName}</strong>,</p>
                            <p>Chúng tôi vui mừng thông báo rằng tài khoản người thu gom của bạn đã được tạo thành công tại <strong>${enterpriseName}</strong>.</p>
                            <p>Dưới đây là thông tin đăng nhập của bạn:</p>

                            <!-- Credentials Table -->
                            <table role="presentation" class="credentials-table">
                                <tr>
                                    <th>Email</th>
                                    <td>${email}</td>
                                </tr>
                                <tr>
                                    <th>Mật khẩu</th>
                                    <td>${rawPassword}</td>
                                </tr>
                            </table>

                            <!-- Warning -->
                            <table role="presentation" class="warning">
                                <tr>
                                    <td>
                                        <p>
                                            ⚠️ <strong>Lưu ý:</strong> Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu để đảm bảo bảo mật tài khoản.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="#" class="cta-button">
                                            Đăng nhập ngay
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
                <table role="presentation" class="footer">
                    <tr>
                        <td>
                            <p>
                                Bạn nhận được email này vì doanh nghiệp đã tạo tài khoản cho bạn.
                            </p>
                            <p>
                                © 2026 Waste Delivery Platform. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

    try {
      await this.mailerService.sendMail({ to: email, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send account email to ${email}:`, error);
    }
  }

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
    // const rawPassword = Math.random().toString(36).slice(-8); // Generate 8 char random password
    const rawPassword = '123456';
    const hashedPwd = await hash(rawPassword, 10);

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
      const result = await this.prisma.$transaction(async (tx) => {
        let userId: number;

        if (isSoftDeletedUser) {
          const reactivated = await tx.user.update({
            where: { id: existingEmail.id },
            data: {
              deletedAt: null,
              status: 'ACTIVE',
              password: hashedPwd,
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
              password: hashedPwd,
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

          return updated;
        }

        return await tx.collector.create({
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
      });

      // Send email (after transaction is successful)
      setImmediate(async () => {
        try {
          // Fetch enterprise name for the email
          const enterprise = await this.prisma.enterprise.findUnique({
            where: { id: enterpriseId },
            select: { name: true },
          });
          const enterpriseName = enterprise?.name || 'Waste Delivery Platform';

          await this.sendCollectorAccountEmail(
            dto.email,
            dto.fullName,
            rawPassword,
            enterpriseName,
          );
        } catch (err) {
          this.logger.error(`Failed to send email to collector ${dto.email}`, err.stack);
        }
      });

      return successResponse(200, result, 'Collector created and email sent');
    } catch (error) {
      this.logger.error('Failed to create/reactivate collector', error);
      return errorResponse(500, 'Failed to create collector', error.message);
    }
  }
  async getProfile(collectorId: number) {
    const collector = await this.prisma.collector.findUnique({
      where: { id: collectorId },
      select: {
        id: true,
        employeeCode: true,
        workingHours: true,
        // trustScore: true,
        // earnings: true,
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            avatar: true,
            // balance: true,
          },
        },
        status: {
          select: {
            availability: true,
          },
        },
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
                avatar: true,
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

    return successResponse(
      200,
      formattedTasks,
      'Get accepted reports successfully',
    );
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

  async getReportHistory(collectorId: number, query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = {
      collectorId,
      OR: [
        { status: 'COLLECTED' },
        {
          status: 'REJECTED',
          report: {
            status: {
              in: [
                'FAILED_NO_RESPONSE',
                'FAILED_CITIZEN_NOT_HOME',
                'CANCELLED',
                'REJECTED',
              ],
            },
          },
        },
      ],
    } as any;

    const [total, history] = await Promise.all([
      this.prisma.collectorTaskAttempt.count({ where }),
      this.prisma.collectorTaskAttempt.findMany({
        where,
        skip,
        take: +limit,
        include: {
          report: {
            include: {
              wasteItems: true,
              actualWasteItems: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedHistory = history.map((h) => ({
      reportId: h.report.id,
      address: h.report.address,
      status: h.report.status,
      cancelReason: h.report.cancelReason,
      completedAt: h.report.completedAt || h.report.updatedAt,
      actualWeight: h.report.actualWeight ? Number(h.report.actualWeight) : 0,
      accuracyBucket: h.report.accuracyBucket,
      evidenceImages: h.report.evidenceImages || [],
      wasteItems: h.report.wasteItems.map((wi) => ({
        type: wi.wasteType,
        weight: Number(wi.weightKg),
      })),
      actualWasteItems:
        h.report.actualWasteItems.length > 0
          ? h.report.actualWasteItems.map((wi) => ({
              type: wi.wasteType,
              weight: Number(wi.weightKg),
            }))
          : null,
    }));

    return successResponse(
      200,
      {
        data: formattedHistory,
        meta: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Lấy lịch sử report thành công',
    );
  }



  // ==================== ENTERPRISE MANAGEMENT ====================

  async getCollectors(enterpriseId: number, query: any) {
    const { status, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      enterpriseId,
      deletedAt: null,
    };

    if (status) {
      where.status = { availability: status };
    }

    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, collectors] = await Promise.all([
      this.prisma.collector.count({ where }),
      this.prisma.collector.findMany({
        where,
        skip,
        take: +limit,
        select: {
          id: true,
          employeeCode: true,
          user: {
            select: {
              fullName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          status: {
            select: {
              availability: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return successResponse(
      200,
      {
        data: collectors,
        meta: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Lấy danh sách collector thành công',
    );
  }

  async getCollectorById(enterpriseId: number, id: number) {
    const collector = await this.prisma.collector.findFirst({
      where: { id, enterpriseId, deletedAt: null },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        status: true,
      },
    });

    if (!collector) return errorResponse(404, 'Không tìm thấy collector');

    return successResponse(200, collector, 'Lấy chi tiết collector thành công');
  }

  async updateCollector(enterpriseId: number, id: number, dto: any) {
    const collector = await this.prisma.collector.findFirst({
      where: { id, enterpriseId, deletedAt: null },
    });

    if (!collector) return errorResponse(404, 'Không tìm thấy collector');

    const { fullName, phone, avatar } = dto;

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: collector.userId },
        data: {
          ...(fullName && { fullName }),
          ...(phone !== undefined && { phone }),
          ...(avatar !== undefined && { avatar }),
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          avatar: true,
        },
      });

      return successResponse(
        200,
        {
          ...collector,
          user: updatedUser,
        },
        'Cập nhật thông tin cơ bản collector thành công',
      );
    } catch (error) {
      this.logger.error('Failed to update collector profile', error);
      return errorResponse(
        500,
        'Lỗi cập nhật thông tin collector',
        error.message,
      );
    }
  }

  async deleteCollector(enterpriseId: number, id: number) {
    const collector = await this.prisma.collector.findFirst({
      where: { id, enterpriseId, deletedAt: null },
    });

    if (!collector) return errorResponse(404, 'Không tìm thấy collector');

    try {
      await this.prisma.$transaction(async (tx) => {
        // Soft delete collector
        await tx.collector.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            isActive: false,
          },
        });

        // Soft delete user (or just mark as inactive/banned)
        // Here we just mark account as DELETED if appropriate
        await tx.user.update({
          where: { id: collector.userId },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
          },
        });
      });

      return successResponse(200, null, 'Xóa collector thành công');
    } catch (error) {
      this.logger.error('Failed to delete collector', error);
      return errorResponse(500, 'Lỗi xóa collector', error.message);
    }
  }
}
