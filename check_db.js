// Use ts-node directly or standard commonjs?
const { PrismaClient } = require('./generated/prisma'); // or ./generated/prisma/index.js
const prisma = new PrismaClient();
async function run() {
  try {
    const userId = 1; // From the JWT payload decoded: payload.id = 1
    const ent = await prisma.enterprise.findUnique({
      where: { userId: userId },
      include: { serviceAreas: true }
    });
    console.log('ENTERPRISE DATA:');
    console.log(JSON.stringify(ent, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
