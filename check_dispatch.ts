import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking collectors for enterprise");
    
    // Giả sử lấy enterprise đầu tiên
    const ent = await prisma.enterprise.findFirst();
    if (!ent) {
        console.log("No enterprise found");
        return;
    }
    
    const candidates = await prisma.collector.findMany({
      where: {
        enterpriseId: ent.id,
        isActive: true,
        deletedAt: null,
        status: {
          availability: 'ONLINE_AVAILABLE',
          queueLength: { lt: 6 },
        },
      },
      include: {
        status: true,
        user: true,
      },
    });

    console.log("Candidates found:", candidates.length);
    if(candidates.length > 0) {
        console.log("First candidate working hours:", JSON.stringify(candidates[0].workingHours));
        const workingHours = candidates[0].workingHours;
        const now = new Date();
        const day = now.toLocaleDateString('en-US', { weekday: 'long' });
        const time = now.getHours() * 100 + now.getMinutes();
        console.log(`Now is ${day} ${now.getHours()}:${now.getMinutes()} -> time: ${time}`);
        
        // This is what isWorkingHour does
        const config = workingHours?.[day] || workingHours?.[day.toLowerCase()];
        console.log("Config for today:", config);
        
        if (!config || !config.active) {
            console.log("isWorkingHour: false (no config or not active)");
        } else {
            const start = parseInt(config.start.replace(':', ''));
            const end = parseInt(config.end.replace(':', ''));
            console.log(`start: ${start}, end: ${end}`);
            console.log("isWorkingHour:", time >= start && time <= end);
        }
    }
    
    const attempts = await prisma.collectorTaskAttempt.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3
    });
    console.log("Recent Attempts:", attempts);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
