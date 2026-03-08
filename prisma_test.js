const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const attempts = await prisma.collectorTaskAttempt.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
            collector: {
                include: {
                    user: true
                }
            }
        }
    });
    console.log(JSON.stringify(attempts, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
