<<<<<<< HEAD
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { errorResponse, successResponse } from 'src/common/utils/response.util';
import { NotificationGateway } from '../../notification/gateways/notification.gateway';
import { DispatchService } from '../../dispatch/services/dispatch.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class ReportAssignmentService {
  private readonly logger = new Logger(ReportAssignmentService.name);

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
    private dispatchService: DispatchService,
    private notificationService: NotificationService,
  ) {}

  async enterpriseAccept(reportId: number, userId: number) {
    const enterprise = await this.prisma.enterprise.findFirst({
      where: { userId },
      select: { id: true, name: true },
    });

    if (!enterprise) {
      return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep');
    }

    const enterpriseId = enterprise.id;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Atomic Update status PENDING -> ENTERPRISE_RESERVED
        const reportUpdate = await tx.report.updateMany({
          where: { id: reportId, status: 'PENDING' },
          data: {
            status: 'ENTERPRISE_RESERVED',
            currentEnterpriseId: enterpriseId,
          },
        });

        if (reportUpdate.count === 0) {
          const check = await tx.report.findUnique({ where: { id: reportId } });
          if (!check) throw new Error('Báo cáo không tồn tại');
          throw new Error(
            `Báo cáo đang ở trạng thái "${check.status}", không thể chấp nhận`,
          );
        }

        // 2. Mark attempt as ACCEPTED
        await tx.reportEnterpriseAttempt.updateMany({
          where: { reportId, enterpriseId, status: 'WAITING' },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        });

        // 3. Mark other attempts as EXPIRED
        await tx.reportEnterpriseAttempt.updateMany({
          where: { reportId, status: 'WAITING' },
          data: { status: 'EXPIRED', respondedAt: new Date() },
        });

        return { success: true };
      });

      // 4. Trigger auto-dispatch (Background)
      setTimeout(() => {
        this.dispatchService
          .dispatchToCollector(reportId, enterpriseId)
          .then((res) => {
            if (!res)
              this.logger.warn(
                `No collector found for auto-dispatch of report ${reportId}`,
              );
          });
      }, 500);

      return successResponse(
        200,
        null,
        'Đã đặt chỗ báo cáo. Hệ thống đang tìm người thu gom phù hợp.',
      );
    } catch (error) {
      this.logger.error('Error in enterpriseAccept:', error);
      return errorResponse(400, error.message || 'Lỗi xử lý đặt chỗ báo cáo');
    }
  }

  async enterpriseReject(reportId: number, userId: number) {
    const enterprise = await this.prisma.enterprise.findFirst({
      where: { userId },
      select: { id: true, name: true },
    });

    if (!enterprise) {
      return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep');
    }

    const enterpriseId = enterprise.id;

    const attempt = await this.prisma.reportEnterpriseAttempt.findUnique({
      where: {
        reportId_enterpriseId: { reportId, enterpriseId },
      },
    });

    if (!attempt || attempt.status !== 'WAITING') {
      return errorResponse(400, 'Ban khong co quyen phan tich bao cao');
    }

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { deletedAt: true, status: true },
    });

    if (report?.deletedAt) {
      return errorResponse(
        400,
        'Báo cáo đã bị hủy bởi citizen',
        'REPORT_CANCELLED',
      );
    }

    await this.prisma.reportEnterpriseAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
      },
    });

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'PENDING',
        currentEnterpriseId: null,
      },
    });

    return successResponse(
      200,
      null,
      'Doanh nghiep da tu choi bao cao rac nay  ',
    );
  }

  async handleTimeoutAttempts(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const timeoutAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
      where: {
        status: 'WAITING',
        expiredAt: { lte: new Date() },
        // sentAt: { lt: tenMinutesAgo }
      },
      include: {
        report: {
          include: {
            citizen: {
              select: { id: true },
            },
          },
        },
      },
    });

    for (const attempt of timeoutAttempts) {
      // Skip nếu report đã bị hủy
      if (!attempt.report || attempt.report.deletedAt) {
        this.logger.log(
          `⏰ Attempt ${attempt.id} thuộc report đã bị hủy, bỏ qua`,
        );
        continue;
      }

      await this.prisma.reportEnterpriseAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'EXPIRED',
          respondedAt: new Date(),
        },
      });

      await this.prisma.report.update({
        where: { id: attempt.reportId },
        data: {
          status: 'PENDING',
          currentEnterpriseId: null,
        },
      });

      // Notify Citizen khi enterprise attempt hết hạn (non-blocking)
      if (attempt.report?.citizen?.id) {
        setImmediate(async () => {
          try {
            await this.notificationService.createAndNotify({
              userId: attempt.report.citizen.id,
              type: NotificationType.REPORT_STATUS_CHANGED,
              title: '⏰ Chưa tìm được doanh nghiệp phù hợp',
              content:
                'Báo cáo của bạn đang được hệ thống tiếp tục tìm kiếm doanh nghiệp thu gom phù hợp. Vui lòng chờ thêm.',
              meta: {
                reportId: attempt.reportId,
                action: 'ENTERPRISE_EXPIRED',
              },
            });
          } catch (err) {
            this.logger.error(
              `Failed to notify citizen on enterprise timeout for report ${attempt.reportId}`,
              err?.message,
            );
          }
        });
      }

      this.logger.log(
        `⏰ Attempt ${attempt.id} hết thời gian - báo cáo ${attempt.reportId} trả về PENDING`,
      );
    }
  }

  async getAllWaitingReports(userId: number) {
    const enterprise = await this.prisma.enterprise.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!enterprise) {
      return errorResponse(400, 'Ban khong co quyen truy cap doanh nghiep');
    }

    const enterpriseId = enterprise.id;

    const waitingAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
      where: {
        enterpriseId,
        status: 'WAITING',
      },
      include: {
        report: {
          include: {
            citizen: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    const reports = waitingAttempts.map((attempt) => ({
      ...attempt.report,
      sentAt: attempt.sentAt,
      attemptId: attempt.id,
    }));

    this.logger.log(
      `📋 Doanh nghiệp ${enterpriseId} lấy ${reports.length} báo cáo đang đợi phản hồi`,
    );

    return successResponse(
      200,
      reports,
      `Lay thanh cong ${reports.length} bao cao dang doi phan hoi`,
    );
  }
}
=======
﻿import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { errorResponse, successResponse } from 'src/common/utils/response.util'
import { NotificationGateway } from '../../notification/gateways/notification.gateway'
import { NotificationType } from 'generated/prisma/enums'

@Injectable()
export class ReportAssignmentService {
    private readonly logger = new Logger(ReportAssignmentService.name)

    constructor(
        private prisma: PrismaService,
        private notificationGateway: NotificationGateway
    ) { }

    async enterpriseAccept(reportId: number, userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true, name: true, status: true }
        })

        if (!enterprise) {
            return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep')
        }

        if (enterprise.status === 'EXPIRED') {
            return errorResponse(400, 'Goi dich vu da het han. Vui long gia han de tiep tuc nhan don.')
        }

        const enterpriseId = enterprise.id

        const attempt = await this.prisma.reportEnterpriseAttempt.findUnique({
            where: {
                reportId_enterpriseId: { reportId, enterpriseId }
            }
        })

        if (!attempt || attempt.status !== 'WAITING') {
            return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep')
        }

        // Láº¥y thÃ´ng tin bÃ¡o cÃ¡o vÃ  chá»§ sá»Ÿ há»¯u (citizen)
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            select: {
                citizenId: true,
                deletedAt: true,
                status: true
            }
        })

        if (!report) {
            return errorResponse(400, 'BÃ¡o cÃ¡o khÃ´ng tá»“n táº¡i')
        }

        if (report.deletedAt) {
            return errorResponse(400, 'BÃ¡o cÃ¡o Ä‘Ã£ bá»‹ há»§y bá»Ÿi citizen', 'REPORT_CANCELLED')
        }

        if (report.status !== 'PENDING') {
            return errorResponse(400, `BÃ¡o cÃ¡o Ä‘ang á»Ÿ tráº¡ng thÃ¡i "${report.status}", khÃ´ng thá»ƒ cháº¥p nháº­n`, 'INVALID_STATUS')
        }

        await this.prisma.reportEnterpriseAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'ACCEPTED',
                respondedAt: new Date()
            }
        })

        await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: 'ACCEPTED',
                currentEnterpriseId: enterpriseId
            }
        })

        await this.prisma.reportAssignment.create({
            data: {
                reportId,
                enterpriseId
            }
        })

        await this.prisma.reportEnterpriseAttempt.updateMany({
            where: {
                reportId,
                id: { not: attempt.id },
                status: 'WAITING'
            },
            data: {
                status: 'EXPIRED',
                respondedAt: new Date()
            }
        })

        if (report.citizenId) {
            const notification = await this.prisma.notification.create({
                data: {
                    userId: report.citizenId,
                    type: NotificationType.REPORT_STATUS_CHANGED,
                    title: 'BÃ¡o cÃ¡o Ä‘Ã£ Ä‘Æ°á»£c tiáº¿p nháº­n',
                    content: 'BÃ¡o cÃ¡o cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c tiáº¿p nháº­n vÃ  sáº½ sá»›m Ä‘Æ°á»£c xá»­ lÃ½.',
                    meta: { reportId, action: 'ACCEPTED' }
                }
            })

            this.notificationGateway.notifyUser(report.citizenId, {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                content: notification.content,
                meta: notification.meta,
                createdAt: notification.createdAt
            })

            this.logger.log(`ðŸ“¬ ÄÃ£ gá»­i notification cho citizen ${report.citizenId}`)
        }

        this.logger.log(`âœ… Doanh nghiá»‡p ${enterpriseId} Ä‘Ã£ cháº¥p nháº­n bÃ¡o cÃ¡o ${reportId}`)
        return successResponse(200, null, 'Doanh nghiep da chap nhan bao cao rac nay')

    }

    async enterpriseReject(reportId: number, userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true, name: true, status: true }
        })

        if (!enterprise) {
            return errorResponse(400, 'Ban khong co quyen tuy chon doanh nghiep')
        }

        if (enterprise.status === 'EXPIRED') {
            return errorResponse(400, 'Goi dich vu da het han. Vui long gia han de tiep tuc nhan don.')
        }

        const enterpriseId = enterprise.id

        const attempt = await this.prisma.reportEnterpriseAttempt.findUnique({
            where: {
                reportId_enterpriseId: { reportId, enterpriseId }
            }
        })

        if (!attempt || attempt.status !== 'WAITING') {
            return errorResponse(400, 'Ban khong co quyen phan tich bao cao')
        }

        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            select: { deletedAt: true, status: true }
        })

        if (report?.deletedAt) {
            return errorResponse(400, 'BÃ¡o cÃ¡o Ä‘Ã£ bá»‹ há»§y bá»Ÿi citizen', 'REPORT_CANCELLED')
        }

        await this.prisma.reportEnterpriseAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'REJECTED',
                respondedAt: new Date()
            }
        })

        await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: 'PENDING',
                currentEnterpriseId: null
            }
        })


        return successResponse(200, null, 'Doanh nghiep da tu choi bao cao rac nay  ')
    }

    async handleTimeoutAttempts(): Promise<void> {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

        const timeoutAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
            where: {
                status: 'WAITING',
                expiredAt: { lte: new Date() }
                // sentAt: { lt: tenMinutesAgo }
            },
            include: {
                report: {
                    include: {
                        citizen: {
                            select: { id: true }
                        }
                    }
                }
            }
        })

        for (const attempt of timeoutAttempts) {
            // Skip náº¿u report Ä‘Ã£ bá»‹ há»§y
            if (!attempt.report || attempt.report.deletedAt) {
                this.logger.log(`â° Attempt ${attempt.id} thuá»™c report Ä‘Ã£ bá»‹ há»§y, bá» qua`)
                continue
            }

            await this.prisma.reportEnterpriseAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: 'EXPIRED',
                    respondedAt: new Date()
                }
            })

            await this.prisma.report.update({
                where: { id: attempt.reportId },
                data: {
                    status: 'PENDING',
                    currentEnterpriseId: null
                }
            })

            // Gá»­i notification háº¿t háº¡n
            // if (attempt.report?.citizen?.id) {
            //     const notification = await this.prisma.notification.create({
            //         data: {
            //             userId: attempt.report.citizen.id,
            //             type: NotificationType.REPORT_STATUS_CHANGED,
            //             title: 'BÃ¡o cÃ¡o Ä‘Ã£ háº¿t thá»i gian pháº£n há»“i',
            //             content: 'KhÃ´ng cÃ³ doanh nghiá»‡p nÃ o cháº¥p nháº­n bÃ¡o cÃ¡o cá»§a báº¡n. Vui lÃ²ng táº¡o láº¡i bÃ¡o cÃ¡o.',
            //             meta: { reportId: attempt.reportId, action: 'EXPIRED' }
            //         }
            //     })

            //     this.notificationGateway.notifyUser(attempt.report.citizen.id, {
            //         id: notification.id,
            //         type: notification.type,
            //         title: notification.title,
            //         content: notification.content,
            //         meta: notification.meta,
            //         createdAt: notification.createdAt
            //     })
            // }

            this.logger.log(`â° Attempt ${attempt.id} háº¿t thá»i gian - bÃ¡o cÃ¡o ${attempt.reportId} tráº£ vá» PENDING`)
        }
    }

    async getAllWaitingReports(userId: number) {
        const enterprise = await this.prisma.enterprise.findFirst({
            where: { userId },
            select: { id: true }
        })

        if (!enterprise) {
            return errorResponse(400, 'Ban khong co quyen truy cap doanh nghiep')
        }

        const enterpriseId = enterprise.id

        const waitingAttempts = await this.prisma.reportEnterpriseAttempt.findMany({
            where: {
                enterpriseId,
                status: 'WAITING'
            },
            include: {
                report: {
                    include: {
                        citizen: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                                email: true
                            }
                        },
                    }
                }
            },
            orderBy: {
                sentAt: 'desc'
            }
        })

        const reports = waitingAttempts.map(attempt => ({
            ...attempt.report,
            sentAt: attempt.sentAt,
            attemptId: attempt.id
        }))

        this.logger.log(`ðŸ“‹ Doanh nghiá»‡p ${enterpriseId} láº¥y ${reports.length} bÃ¡o cÃ¡o Ä‘ang Ä‘á»£i pháº£n há»“i`)

        return successResponse(200, reports, `Lay thanh cong ${reports.length} bao cao dang doi phan hoi`)
    }


}
>>>>>>> 630cc8dbeec8327299ddff79c4347b2b48f388ea
