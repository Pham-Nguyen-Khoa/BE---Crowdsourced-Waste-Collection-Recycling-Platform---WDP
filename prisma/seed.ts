import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

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
