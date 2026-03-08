import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

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
    console.log("Recent Task Attempts:", JSON.stringify(attempts, null, 2));

    const colls = await prisma.collector.findMany({
        take: 3,
        include: { user: true, status: true }
    });
    console.log("Random Collectors:", JSON.stringify(colls, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
