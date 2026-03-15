import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Seed Roles
  const roles = [
    { id: 1, name: 'CITIZEN' },
    { id: 2, name: 'ENTERPRISE' },
    { id: 3, name: 'COLLECTOR' },
    { id: 4, name: 'ADMIN' },
  ];

  console.log('Seeding roles...');
  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name as any },
      create: { id: role.id, name: role.name as any },
    });
  }

  // 2. Seed Permissions
  const permissions = [
    { id: 1, code: 'CREATE_REPORT', description: 'Citizen tạo báo cáo rác' },
    { id: 2, code: 'REGISTER_ENTERPRISE', description: 'Đăng ký doanh nghiệp' },
    { id: 3, code: 'CREATE_NOTIFICATION', description: 'Tạo thông báo' },
    { id: 4, code: 'CREATE_COLLECTOR', description: 'Tạo nhân viên thu gom rác doanh nghiệp' },
    { id: 5, code: 'DELETE_COLLECTOR', description: 'Xóa người thu gom rác' },
    { id: 6, code: 'UPDATE_COLLECTOR', description: 'Cập nhật thông tin người thu gom rác' },
  ];

  console.log('Seeding permissions...');

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { id: permission.id },
      update: {
        code: permission.code,
        description: permission.description,
      },
      create: {
        id: permission.id,
        code: permission.code,
        description: permission.description,
      },
    });
  }

  console.log('Seeding role permissions...');
  const rolePermissions = [
    { roleId: 1, permissionId: 1, isActive: true },
    { roleId: 1, permissionId: 2, isActive: true },
    { roleId: 2, permissionId: 4, isActive: true },
    { roleId: 2, permissionId: 5, isActive: true },
    { roleId: 2, permissionId: 6, isActive: true },
    { roleId: 4, permissionId: 3, isActive: true },
  ];

  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rp.roleId,
          permissionId: rp.permissionId,
        },
      },
      update: {
        isActive: rp.isActive,
      },
      create: {
        roleId: rp.roleId,
        permissionId: rp.permissionId,
        isActive: rp.isActive,
      },
    });
  }

  // // 4. Seed Users
  // console.log('Seeding users...');
  // const hashedPassword = await bcrypt.hash('password123', 10);




  // 5. Seed Enterprise records
  console.log('Seeding enterprises...');
  // await prisma.enterprise.upsert({
  //   where: { id: 1 },
  //   update: {},
  //   create: {
  //     id: 1,
  //     userId: 3,
  //     name: 'Môi Trường Xanh Corp',
  //     status: 'ACTIVE',
  //     address: 'Phường Linh Chiểu, Thủ Đức, TP.HCM',
  //     latitude: 10.850721,
  //     longitude: 106.771911,
  //     capacityKg: 5000.0,
  //   }
  // });

  // 6. Seed Subscription Plans & Subscriptions
  console.log('Seeding subscriptions...');
  const plans = [
    { id: 1, name: 'Gói 1 tháng', price: 100000, durationMonths: 1, description: 'Dành cho doanh nghiệp muốn trải nghiệm ' },
    { id: 2, name: 'Gói 6 tháng', price: 50000, durationMonths: 6, description: 'Đầy đủ tính năng đối soát' },
    { id: 3, name: 'Gói 12 tháng', price: 100000, durationMonths: 12, description: 'Đầy đủ tính năng đối soát' },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlanConfig.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }

  // Tạo Subscription đang hoạt động cho Enterprise 1
  // await prisma.subscription.upsert({
  //   where: { id: 1 },
  //   update: {},
  //   create: {
  //     id: 1,
  //     enterpriseId: 1,
  //     subscriptionPlanConfigId: 2,
  //     startDate: new Date(),
  //     endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
  //     isActive: true,
  //   }
  // });

  // 7. Seed Payments
  // console.log('Seeding payments...');
  // await prisma.payment.upsert({
  //   where: { id: 1 },
  //   update: {},
  //   create: {
  //     id: 1,
  //     userId: 3,
  //     enterpriseId: 1,
  //     subscriptionPlanConfigId: 2,
  //     amount: 1200000,
  //     status: 'PAID',
  //     method: 'BANK_TRANSFER',
  //     description: 'Thanh toán gói chuyên nghiệp 3 tháng',
  //     referenceCode: 'PAY-123456',
  //   }
  // });

  // 8. Seed Zone
  // console.log('Seeding zones...');
  // await prisma.zone.upsert({
  //   where: { id: 1 },
  //   update: {},
  //   create: {
  //     id: 1,
  //     enterpriseId: 1,
  //     code: 'ZONE-TD-01',
  //     name: 'Khu vực Thủ Đức 01',
  //     provinceCode: '79', // TP.HCM
  //     districtCode: '762', // Thủ Đức
  //     isActive: true,
  //   }
  // });

  // 9. Seed Enterprise Waste Types
  // console.log('Seeding enterprise waste types...');
  // const enterpriseWasteTypes = ['ORGANIC', 'RECYCLABLE', 'HAZARDOUS'];
  // for (const type of enterpriseWasteTypes) {
  //   await prisma.enterpriseWasteType.upsert({
  //     where: { enterpriseId_wasteType: { enterpriseId: 1, wasteType: type as any } },
  //     update: {},
  //     create: {
  //       enterpriseId: 1,
  //       wasteType: type as any,
  //     }
  //   });
  // }

  // // 10. Seed Collector
  // console.log('Seeding collectors...');
  // const defaultWorkingHours = {
  //   Monday: { start: '08:00', end: '17:00', active: true },
  //   Tuesday: { start: '08:00', end: '17:00', active: true },
  //   Wednesday: { start: '08:00', end: '17:00', active: true },
  //   Thursday: { start: '08:00', end: '17:00', active: true },
  //   Friday: { start: '08:00', end: '17:00', active: true },
  //   Saturday: { start: '08:00', end: '12:00', active: true },
  //   Sunday: { start: '00:00', end: '00:00', active: false },
  // };

  // await prisma.collector.upsert({
  //   where: { id: 1 },
  //   update: {},
  //   create: {
  //     id: 1,
  //     userId: 4,
  //     enterpriseId: 1,
  //     employeeCode: 'COL-001',
  //     trustScore: 100,
  //     isActive: true,
  //     workingHours: defaultWorkingHours,
  //     primaryZoneId: 1,
  //   }
  // });

  // // 11. Seed Gifts
  // console.log('Seeding gifts...');
  // const gifts = [
  //   { id: 1, name: 'Voucher 20k', requiredPoints: 200, stock: 50, isActive: true },
  //   { id: 2, name: 'Bình giữ nhiệt', requiredPoints: 500, stock: 20, isActive: true },
  // ];
  // for (const g of gifts) {
  //   await prisma.gift.upsert({
  //     where: { id: g.id },
  //     update: g,
  //     create: g,
  //   });
  // }

  // 12. Seed System Config
  console.log('Seeding system config...');
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      citizenBasePoint: 100,
      organicMultiplier: 1.0,
      recyclableMultiplier: 1.2,
      hazardousMultiplier: 1.5,
      accuracyMatchMultiplier: 1.0,
      accuracyModerateMultiplier: 0.7,
      accuracyHeavyMultiplier: 0.3,
      collectorMatchTrustScore: 2,
      penaltyWeightMismatch: 20,
      penaltyUnauthorizedFee: 30,
      penaltyNoShow: 15,
      penaltyDefault: 10,
      citizenCompensation: 50,
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
