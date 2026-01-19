import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class AuthRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Find active user by email.
     * The original project used an email+provider composite; current schema stores only email.
     */
    /**
     * Find active user by email.
     * This project currently only uses local email login (no oauth providers).
     */
    async findByEmail(email: string) {
        return this.prisma.user.findFirst({
            where: {
                email,
                deletedAt: null,
            },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true },
                        },
                    },
                },
            },
        });
    }


    async findByID(id: number) {
        return this.prisma.user.findFirst({
            where: { id: id, deletedAt: null },
            include: {
                role: { include: { permissions: { include: { permission: true } } } },
            },
        });
    }


    async createNewUser(data: { email: string; password: string; fullName?: string; phone?: string; roleId?: number; avatar?: string }) {
        const roleId = data.roleId ?? 1; 
        return (this.prisma.user as any).create({
            data: {
                email: data.email,
                password: data.password,
                fullName: data.fullName ?? '',
                phone: data.phone ?? null,
                avatar: data.avatar ?? null,
                roleId,
            },
        } as any);
    }

    async createNewUserFacebook(data: { email: string; fullName?: string; avatar?: string; roleId?: number }) {
        const roleId = data?.roleId ?? 1;
        return (this.prisma.user as any).create({
            data: {
                email: data.email,
                fullName: data.fullName ?? '',
                avatar: data.avatar ?? null,
                roleId,
            },
        } as any);
    }

    async createPasswordReset(userID: number, otpHash: string) {
        await (this.prisma as any).passwordReset.create({
            data: {
                userID,
                otpHash,
                expiresAt: new Date(Date.now() + 3 * 60 * 1000),
            },
        });
    }


    async getPasswordReset(userID: number) {
        return await (this.prisma as any).passwordReset.findFirst({
            where: {
                userID,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getPasswordResetNormal(userID: number) {
        return await (this.prisma as any).passwordReset.findMany({
            where: {
                userID,
            },
            orderBy: { createdAt: 'desc' },
        });
    }


    async updateAttempt(recordID: number) {
        await (this.prisma as any).passwordReset.update({
            where: { id: recordID },
            data: { attempt: { increment: 1 } },
        });
    }

    async updateUsed(userID: number) {
        await (this.prisma as any).passwordReset.updateMany({
            where: { userID },
            data: { used: true },
        });
    }
    async updateUserAvatar(userID: number, newAvatar) {
        await (this.prisma.user as any).update({
            where: { id: userID },
            data: { avatar: newAvatar },
        } as any);
    }

    async updatePasswordByUser(userID: number, hashPassword: string) {
        await this.prisma.user.update({
            where: { id: userID },
            data: { password: hashPassword },
        });

    }


    async deleteRecordPasswordByUser(userID: number) {
        await (this.prisma as any).passwordReset.deleteMany({
            where: { userID },
        });
    }

    async lastOTPByUser(userID: number) {
        return await (this.prisma as any).passwordReset.findFirst({
            where: { userID },
            orderBy: { createdAt: 'desc' },
        });
    }


}
