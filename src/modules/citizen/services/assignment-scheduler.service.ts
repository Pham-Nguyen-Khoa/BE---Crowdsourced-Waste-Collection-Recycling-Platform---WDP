// import { Injectable, Logger } from '@nestjs/common';
// import { PrismaService } from '../../../libs/prisma/prisma.service';
// import { EnterprisePriority, EnterprisePriorityFilter } from '../dtos/enterprise-priority.dto';
// import { ReportStatus, EnterpriseStatus, CollectorAvailability } from '@prisma/client';
// import { DateHelper } from '../../../helper/date.helper';

// @Injectable()
// export class ReportDispatcherService {
//   private readonly logger = new Logger(ReportDispatcherService.name);

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly dateHelper: DateHelper,
//   ) { }

//   /**
//    * Lọc và sắp xếp danh sách doanh nghiệp ưu tiên cho report
//    */
//   async getPrioritizedEnterprises(filter: EnterprisePriorityFilter): Promise<EnterprisePriority[]> {
//     const { reportId, wasteTypes, provinceCode, districtCode, wardCode, totalWeightKg, reportLatitude, reportLongitude } = filter;

//     this.logger.log(`Filtering enterprises for report ${reportId} with waste types: ${wasteTypes.join(', ')}`);

//     // Bước 1: Lọc doanh nghiệp theo điều kiện cứng
//     const eligibleEnterprises = await this.filterEligibleEnterprises(
//       wasteTypes,
//       provinceCode,
//       districtCode,
//       wardCode,
//       totalWeightKg
//     );

//     if (eligibleEnterprises.length === 0) {
//       this.logger.warn(`No eligible enterprises found for report ${reportId}`);
//       return [];
//     }

//     // Bước 2: Tính toán thông tin ưu tiên cho từng doanh nghiệp
//     const prioritizedEnterprises: EnterprisePriority[] = [];

//     for (const enterprise of eligibleEnterprises) {
//       const priorityInfo = await this.calculateEnterprisePriority(
//         enterprise,
//         reportLatitude,
//         reportLongitude,
//         totalWeightKg
//       );
//       prioritizedEnterprises.push(priorityInfo);
//     }

//     // Bước 3: Sắp xếp theo ưu tiên
//     return this.sortEnterprisesByPriority(prioritizedEnterprises);
//   }

//   /**
//    * Lọc doanh nghiệp theo điều kiện cứng (SQL filter)
//    */
//   private async filterEligibleEnterprises(
//     wasteTypes: string[],
//     provinceCode: string,
//     districtCode: string,
//     wardCode: string,
//     totalWeightKg: number
//   ) {
//     // wasteTypes đã được convert thành enum trong DTO
//     const wasteTypeEnums = wasteTypes as any;

//     const enterprises = await this.prisma.enterprise.findMany({
//       where: {
//         AND: [
//           // Điều kiện cứng 1: ACTIVE status
//           { status: EnterpriseStatus.ACTIVE },

//           // Điều kiện cứng 2: Có subscription còn hiệu lực
//           {
//             subscriptions: {
//               some: {
//                 isActive: true,
//                 endDate: { gte: new Date() }
//               }
//             }
//           },

//           // Điều kiện cứng 3: Có wasteType phù hợp
//           // DN phải có TẤT CẢ loại rác trong báo cáo
//           // {
//           //   AND: wasteTypeEnums.map(wasteType => ({
//           //     wasteTypes: {
//           //       some: { wasteType: wasteType }
//           //     }
//           //   }))
//           // },

//           // Điều kiện cứng 4: Có service area phù hợp (OR logic cho cấp độ)
//           // {
//           //   OR: [
//           //     // Ward level
//           //     {
//           //       serviceAreas: {
//           //         some: {
//           //           provinceCode,
//           //           districtCode,
//           //           wardCode
//           //         }
//           //       }
//           //     },
//           //     // District level (nếu không có ward specific)
//           //     {
//           //       serviceAreas: {
//           //         some: {
//           //           provinceCode,
//           //           districtCode,
//           //           wardCode: null
//           //         }
//           //       }
//           //     },
//           //     // Province level (nếu không có district specific)
//           //     {
//           //       serviceAreas: {
//           //         some: {
//           //           provinceCode,
//           //           districtCode: null,
//           //           wardCode: null
//           //         }
//           //       }
//           //     }
//           //   ]
//           // },

//           // Điều kiện cứng 5: Capacity đủ lớn
//           {
//             capacityKg: { gte: totalWeightKg }
//           },

//           // Không có deletedAt
//           { deletedAt: null }
//         ]
//       },
//       include: {
//         workingHour: true,
//         collectors: {
//           where: { deletedAt: null },
//           include: {
//             status: true
//           }
//         },
//         subscriptions: {
//           where: {
//             isActive: true,
//             endDate: { gte: new Date() }
//           }
//         },
//         reportAssignments: {
//           where: {
//             completedAt: null // Đơn đang xử lý
//           }
//         }
//       }
//     });

//     return enterprises;
//   }

//   /**
//    * Tính toán thông tin ưu tiên cho một doanh nghiệp
//    */
//   private async calculateEnterprisePriority(
//     enterprise: any,
//     reportLatitude: number,
//     reportLongitude: number,
//     totalWeightKg: number
//   ): Promise<EnterprisePriority> {
//     // Tính khoảng cách (Haversine formula)
//     const distance = this.calculateDistance(
//       reportLatitude,
//       reportLongitude,
//       enterprise.latitude,
//       enterprise.longitude
//     );

//     // Đếm số collector available
//     const availableCollectors = enterprise.collectors.filter(collector =>
//       collector.status?.status === CollectorAvailability.AVAILABLE
//     ).length;

//     // Đếm số đơn đang xử lý
//     const activeReports = enterprise.reportAssignments.length;

//     // Kiểm tra VIP (có thể dựa trên subscription plan cao cấp)
//     const isVip = enterprise.subscriptions.some(sub =>
//       sub.subscriptionPlanConfig?.name?.toLowerCase().includes('vip') ||
//       sub.subscriptionPlanConfig?.name?.toLowerCase().includes('premium')
//     );

//     // Tính priority score (càng thấp càng ưu tiên)
//     let priorityScore = 0;

//     // 1. Khoảng cách (0-10 điểm, càng gần càng tốt)
//     priorityScore += Math.min(distance / 10, 10); // Mỗi 10km +1 điểm

//     // 2. Collector available (ít điểm hơn nếu có nhiều collector)
//     priorityScore += Math.max(0, 5 - availableCollectors); // Mỗi collector available -1 điểm

//     // 3. Số đơn đang xử lý (ít điểm hơn nếu ít đơn)
//     priorityScore += Math.min(activeReports, 10); // Mỗi đơn đang xử lý +1 điểm, max 10

//     // 4. VIP bonus (ưu tiên hơn nếu là VIP)
//     if (isVip) {
//       priorityScore -= 2; // Giảm 2 điểm nếu VIP
//     }

//     return {
//       enterpriseId: enterprise.id,
//       enterpriseName: enterprise.name,
//       latitude: enterprise.latitude,
//       longitude: enterprise.longitude,
//       distance,
//       availableCollectors,
//       activeReports,
//       isVip,
//       priorityScore: Math.max(0, priorityScore), // Đảm bảo không âm
//       workingHours: enterprise.workingHour ? {
//         startTime: enterprise.workingHour.startTime,
//         endTime: enterprise.workingHour.endTime
//       } : undefined
//     };
//   }

//   /**
//    * Sắp xếp doanh nghiệp theo ưu tiên (priority score thấp nhất trước)
//    */
//   private sortEnterprisesByPriority(enterprises: EnterprisePriority[]): EnterprisePriority[] {
//     return enterprises.sort((a, b) => a.priorityScore - b.priorityScore);
//   }

//   /**
//    * Tính khoảng cách giữa 2 điểm theo công thức Haversine
//    */
//   private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
//     const R = 6371; // Radius of the Earth in kilometers
//     const dLat = this.toRadians(lat2 - lat1);
//     const dLon = this.toRadians(lon2 - lon1);
//     const a =
//       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//       Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
//       Math.sin(dLon / 2) * Math.sin(dLon / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     const distance = R * c;
//     return distance;
//   }

//   private toRadians(degrees: number): number {
//     return degrees * (Math.PI / 180);
//   }

//   /**
//    * Kiểm tra doanh nghiệp có đang trong giờ làm việc không
//    */
//   isEnterpriseWorkingNow(workingHours?: { startTime: string; endTime: string }): boolean {
//     if (!workingHours) return true; // Nếu không có giờ làm việc, coi như luôn available

//     const now = new Date();
//     const currentTime = now.getHours() * 60 + now.getMinutes(); // Phút trong ngày

//     const [startHour, startMinute] = workingHours.startTime.split(':').map(Number);
//     const [endHour, endMinute] = workingHours.endTime.split(':').map(Number);

//     const startTime = startHour * 60 + startMinute;
//     const endTime = endHour * 60 + endMinute;

//     return currentTime >= startTime && currentTime <= endTime;
//   }

//   /**
//    * Tính thời điểm doanh nghiệp bắt đầu làm việc tiếp theo
//    */
//   getNextWorkingTime(workingHours?: { startTime: string; endTime: string }): Date | null {
//     if (!workingHours) return null;

//     const now = new Date();
//     const [startHour, startMinute] = workingHours.startTime.split(':').map(Number);
//     const nextWorkingTime = new Date(now);
//     nextWorkingTime.setHours(startHour, startMinute, 0, 0);

//     // Nếu giờ hiện tại đã qua giờ bắt đầu làm việc, thì là ngày mai
//     if (now.getHours() * 60 + now.getMinutes() >= startHour * 60 + startMinute) {
//       nextWorkingTime.setDate(nextWorkingTime.getDate() + 1);
//     }

//     return nextWorkingTime;
//   }
// }
