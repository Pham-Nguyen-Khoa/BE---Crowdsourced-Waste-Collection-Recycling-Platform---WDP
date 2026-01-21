// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { PrismaService } from '../../../libs/prisma/prisma.service';
// import { ReportDispatcherService } from './report-dispatcher.service';
// import { ReportStatus } from '@prisma/client';
// import { EnterprisePriority } from '../dtos/enterprise-priority.dto';

// @Injectable()
// export class ReportSchedulerService {
//   private readonly logger = new Logger(ReportSchedulerService.name);

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly reportDispatcher: ReportDispatcherService,
//   ) { }

//   /**
//    * Cron job: Gửi lại report khi doanh nghiệp bắt đầu làm việc
//    * Chạy mỗi 5 phút
//    */
//   @Cron('*/5 * * * *')
//   async handleEnterpriseWorkingHours() {
//     this.logger.log('Running cron: handleEnterpriseWorkingHours');

//     try {
//       // Tìm các report PENDING có scheduled time đã đến
//       const pendingReports = await this.prisma.report.findMany({
//         where: {
//           status: ReportStatus.PENDING,
//           // Có thể cần thêm field để track scheduled time
//           // tạm thời check tất cả PENDING reports
//         },
//         include: {
//           wasteItems: true,
//         }
//       });

//       for (const report of pendingReports) {
//         await this.processPendingReport(report);
//       }
//     } catch (error) {
//       this.logger.error('Error in handleEnterpriseWorkingHours:', error);
//     }
//   }

//   /**
//    * Cron job: Xử lý timeout cho doanh nghiệp (30 phút)
//    * Chạy mỗi phút
//    */
//   @Cron('* * * * *')
//   async handleEnterpriseTimeout() {
//     this.logger.log('Running cron: handleEnterpriseTimeout');

//     try {
//       const timeoutThreshold = new Date();
//       timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - 30); // 30 phút trước

//       // Tìm các assignment đã sent trước timeoutThreshold và report vẫn PENDING
//       const timeoutAssignments = await this.prisma.reportAssignment.findMany({
//         where: {
//           assignedAt: { lt: timeoutThreshold },
//           report: {
//             status: ReportStatus.PENDING
//           }
//         },
//         include: {
//           report: { include: { wasteItems: true } }
//         }
//       });

//       for (const assignment of timeoutAssignments) {
//         // Mark attempt/update assignment and then try next enterprise for that report
//         await this.rejectReport(assignment.report.id, assignment.enterpriseId, 'Enterprise timeout');

//         // Fetch latest report with wasteItems and try next enterprise
//         const report = await this.prisma.report.findUnique({
//           where: { id: assignment.report.id },
//           include: { wasteItems: true }
//         });

//         if (report) {
//           await this.processPendingReport(report);
//         }
//       }
//     } catch (error) {
//       this.logger.error('Error in handleEnterpriseTimeout:', error);
//     }
//   }

//   /**
//    * Xử lý report PENDING - tìm doanh nghiệp tiếp theo để gửi
//    */
//   async processPendingReport(report: any) {
//     try {
//       this.logger.log(`Processing pending report ${report.id}`);

//       // Tính tổng trọng lượng rác
//       const totalWeight = report.wasteItems.reduce(
//         (sum: number, item: any) => sum + Number(item.weightKg),
//         0
//       );

//       // Lấy danh sách waste types
//       const wasteTypes = report.wasteItems.map((item: any) => item.wasteType);

//       // Tạo filter để lấy danh sách doanh nghiệp ưu tiên
//       const filter = {
//         reportId: report.id,
//         wasteTypes,
//         provinceCode: report.provinceCode,
//         districtCode: report.districtCode,
//         wardCode: report.wardCode,
//         totalWeightKg: totalWeight,
//         reportLatitude: report.latitude,
//         reportLongitude: report.longitude,
//       };


//       console.log(filter)

//       // Lấy danh sách doanh nghiệp ưu tiên
//       const prioritizedEnterprises = await this.reportDispatcher.getPrioritizedEnterprises(filter);


//       console.log(prioritizedEnterprises)


//       if (prioritizedEnterprises.length === 0) {
//         this.logger.warn(`No eligible enterprises found for report ${report.id}`);
//         await this.markReportRejected(report.id, 'No eligible enterprises');
//         return;
//       }

//       // Xử lý từng doanh nghiệp theo thứ tự ưu tiên
//       for (const enterprise of prioritizedEnterprises) {
//         const success = await this.trySendReportToEnterprise(report, enterprise);
//         if (success) {
//           break; // Dừng khi có doanh nghiệp chấp nhận
//         }
//       }

//     } catch (error) {
//       this.logger.error(`Error processing report ${report.id}:`, error);
//     }
//   }

//   /**
//    * Thử gửi report đến một doanh nghiệp cụ thể
//    */
//   private async trySendReportToEnterprise(report: any, enterprise: EnterprisePriority): Promise<boolean> {
//     try {
//       // Kiểm tra doanh nghiệp có đang làm việc không
//       const isWorking = this.reportDispatcher.isEnterpriseWorkingNow(enterprise.workingHours);

//       if (!isWorking) {
//         // Nếu không làm việc, tính thời điểm bắt đầu làm việc tiếp theo
//         const nextWorkingTime = this.reportDispatcher.getNextWorkingTime(enterprise.workingHours);

//         if (nextWorkingTime) {
//           this.logger.log(`Enterprise ${enterprise.enterpriseId} not working, scheduling for ${nextWorkingTime}`);
//           // Có thể lưu scheduled time vào database để cron job xử lý
//           // await this.scheduleReportForEnterprise(report.id, enterprise.enterpriseId, nextWorkingTime);
//         }
//         return false; // Chưa gửi được, thử doanh nghiệp tiếp theo
//       }

//       // Gửi report đến doanh nghiệp (tạo notification, gửi email, etc.)
//       const sent = await this.sendReportToEnterprise(report, enterprise);

//       if (sent) {
//         // Đợi phản hồi từ doanh nghiệp
//         this.logger.log(`Report ${report.id} sent to enterprise ${enterprise.enterpriseId}, waiting for response`);

//         // Có thể set timeout để xử lý trường hợp doanh nghiệp không phản hồi
//         // await this.setEnterpriseTimeout(report.id, enterprise.enterpriseId);
//       }

//       return sent;
//     } catch (error) {
//       this.logger.error(`Error sending report ${report.id} to enterprise ${enterprise.enterpriseId}:`, error);
//       return false;
//     }
//   }

//   /**
//    * Gửi report đến doanh nghiệp (tạo assignment, notification, etc.)
//    */
//   private async sendReportToEnterprise(report: any, enterprise: EnterprisePriority): Promise<boolean> {
//     try {
//       // Upsert report assignment (idempotent) - reportId is unique
//       await this.prisma.reportAssignment.upsert({
//         where: { reportId: report.id },
//         create: {
//           reportId: report.id,
//           enterpriseId: enterprise.enterpriseId,
//           assignedAt: new Date()
//         },
//         update: {
//           enterpriseId: enterprise.enterpriseId,
//           assignedAt: new Date()
//         }
//       });

//       // Tạo notification cho enterprise
//       await this.createEnterpriseNotification(report, enterprise);

//       // Có thể gửi email/SMS notification ở đây

//       this.logger.log(`Report ${report.id} assigned to enterprise ${enterprise.enterpriseId}`);
//       return true;
//     } catch (error) {
//       this.logger.error(`Failed to send report ${report.id} to enterprise ${enterprise.enterpriseId}:`, error);
//       return false;
//     }
//   }

//   /**
//    * Xử lý phản hồi từ doanh nghiệp
//    */
//   async handleEnterpriseResponse(reportId: number, enterpriseId: number, accepted: boolean, notes?: string) {
//     try {
//       if (accepted) {
//         // Doanh nghiệp chấp nhận
//         await this.acceptReport(reportId, enterpriseId);
//       } else {
//         // Doanh nghiệp từ chối, thử doanh nghiệp tiếp theo
//         await this.rejectReport(reportId, enterpriseId, notes);
//       }
//     } catch (error) {
//       this.logger.error(`Error handling enterprise response for report ${reportId}:`, error);
//     }
//   }

//   /**
//    * Doanh nghiệp chấp nhận report
//    */
//   private async acceptReport(reportId: number, enterpriseId: number) {
//     await this.prisma.$transaction(async (tx) => {
//       // Cập nhật report status
//       await tx.report.update({
//         where: { id: reportId },
//         data: { status: ReportStatus.ACCEPTED }
//       });

//       // Cập nhật assignment
//       await tx.reportAssignment.updateMany({
//         where: {
//           reportId,
//           enterpriseId
//         },
//         data: {
//           assignedAt: new Date()
//         }
//       });

//       // Có thể assign collector ở đây
//       // const availableCollector = await this.findAvailableCollector(enterpriseId);
//       // if (availableCollector) {
//       //   await tx.reportAssignment.updateMany({
//       //     where: { reportId },
//       //     data: { collectorId: availableCollector.id }
//       //   });
//       // }
//     });

//     this.logger.log(`Report ${reportId} accepted by enterprise ${enterpriseId}`);
//   }

//   /**
//    * Doanh nghiệp từ chối report
//    */
//   private async rejectReport(reportId: number, enterpriseId: number, notes?: string) {
//     // Tìm assignment để ghi attempt / cập nhật completedAt
//     const assignment = await this.prisma.reportAssignment.findFirst({
//       where: { reportId, enterpriseId }
//     });

//     if (assignment) {
//       // Nếu có collector đã được gán, ghi attempt cho collector
//       if (assignment.collectorId) {
//         await this.prisma.reportAttempt.create({
//           data: {
//             reportId,
//             collectorId: assignment.collectorId,
//             result: 'FAILED',
//             note: notes || 'Enterprise rejected'
//           }
//         });
//       }

//       // Đánh dấu assignment hoàn tất (failed)
//       await this.prisma.reportAssignment.update({
//         where: { id: assignment.id },
//         data: { completedAt: new Date() }
//       });
//     } else {
//       // Nếu không có assignment, chỉ ghi log
//       this.logger.log(`No assignment found for report ${reportId} enterprise ${enterpriseId} when rejecting`);
//     }
//   }

//   /**
//    * Xử lý timeout của doanh nghiệp
//    */
//   private async handleReportTimeout(report: any) {
//     // Tương tự như reject, ghi attempt và thử doanh nghiệp tiếp theo
//     await this.rejectReport(report.id, 0, 'Enterprise timeout');
//   }

//   /**
//    * Đánh dấu report bị reject hoàn toàn
//    */
//   private async markReportRejected(reportId: number, reason: string) {
//     await this.prisma.report.update({
//       where: { id: reportId },
//       data: { status: ReportStatus.REJECTED }
//     });

//     this.logger.log(`Report ${reportId} rejected: ${reason}`);
//   }

//   /**
//    * Tạo notification cho enterprise
//    */
//   private async createEnterpriseNotification(report: any, enterprise: EnterprisePriority) {
//     // Tìm user của enterprise
//     const enterpriseUser = await this.prisma.enterprise.findUnique({
//       where: { id: enterprise.enterpriseId },
//       include: { user: true }
//     });

//     if (enterpriseUser?.user) {
//       await this.prisma.notification.create({
//         data: {
//           userId: enterpriseUser.user.id,
//           type: 'REPORT_ASSIGNED',
//           title: 'Đơn thu gom rác mới',
//           content: `Bạn có đơn thu gom rác mới tại ${report.address}`,
//         }
//       });
//     }
//   }

//   /**
//    * Tìm collector available cho enterprise
//    */
//   private async findAvailableCollector(enterpriseId: number) {
//     return this.prisma.collector.findFirst({
//       where: {
//         enterpriseId,
//         deletedAt: null,
//         status: {
//           status: 'AVAILABLE'
//         }
//       }
//     });
//   }
// }
