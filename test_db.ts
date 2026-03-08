import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = "postgresql://postgres:2402@localhost:5432/WDP";

const prisma = new PrismaClient();

async function main() {
    try {
        const ent = await prisma.enterprise.findFirst();
        if (!ent) return console.log("No enterprise");
        const candidates = await prisma.collector.findMany({
            where: { enterpriseId: ent.id, isActive: true },
            include: { status: true }
        });
        console.log("Candidates total:", candidates.length);
        if (candidates.length) {
            console.log("\n--- Collector 0 ---");
            console.log("Collector 0 status:", candidates[0].status);
            console.log("Collector 0 workingHours:", JSON.stringify(candidates[0].workingHours));
            const workingHours = candidates[0].workingHours as any;
            const now = new Date();
            const day = now.toLocaleDateString('en-US', { weekday: 'long' });
            console.log("Mapped Day:", day);
            const config = workingHours?.[day];
            console.log("Config for today:", config);
        }
    } catch(e) {
        console.error("error", e);
    }
}
main().finally(() => prisma.$disconnect());
