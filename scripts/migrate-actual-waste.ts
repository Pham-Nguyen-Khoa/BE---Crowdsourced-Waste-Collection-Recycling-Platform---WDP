
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Bắt đầu di chuyển dữ liệu rác thực tế ---');

  // 1. Lấy tất cả các report đã COMPLETED
  const completedReports = await prisma.report.findMany({
    where: {
      status: 'COMPLETED',
    },
    include: {
      wasteItems: true,
      actualWasteItems: true,
    },
  });

  console.log(`Tìm thấy ${completedReports.length} báo cáo đã hoàn thành.`);

  let migratedCount = 0;

  for (const report of completedReports) {
    // Nếu chưa có dữ liệu ở bảng Actual, thì copy từ bảng WasteItems sang
    if (report.actualWasteItems.length === 0 && report.wasteItems.length > 0) {
      console.log(`Đang di chuyển dữ liệu cho Report ID: ${report.id}`);
      
      await prisma.reportActualWaste.createMany({
        data: report.wasteItems.map(wi => ({
          reportId: report.id,
          wasteType: wi.wasteType,
          weightKg: wi.weightKg,
        }))
      });
      migratedCount++;
    }
  }

  console.log(`--- Hoàn tất! Đã di chuyển dữ liệu cho ${migratedCount} báo cáo ---`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
