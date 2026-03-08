import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// @ts-ignore
console.log('Models found:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
