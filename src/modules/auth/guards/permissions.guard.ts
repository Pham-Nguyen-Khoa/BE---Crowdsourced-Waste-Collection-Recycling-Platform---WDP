import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permission.decorator';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { AuthRepository } from '../repositories/auth.repository';

@Injectable()
export class PermissionGuard implements CanActivate {
    private readonly logger = new Logger(PermissionGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
        private readonly authRepo: AuthRepository,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions =
            this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) || [];

        // No permissions required for this handler
        if (requiredPermissions.length === 0) return true;

        const req = context.switchToHttp().getRequest();
        const user = req?.user;
        if (!user) {
            this.logger.warn('PermissionGuard: request has no user attached');
            throw new UnauthorizedException('Authentication required');
        }

        let dbUser;
        try {
            dbUser = await this.authRepo.findByID(user.id);
        } catch (err) {
            this.logger.error('PermissionGuard: failed to load user from repository', err as Error);
            throw new ForbiddenException('Unable to verify permissions');
        }

        if (!dbUser) {
            this.logger.warn(`PermissionGuard: user not found (id=${user.id})`);
            throw new ForbiddenException('User not found');
        }

        const userPermissions = this.extractPermissionCodes(dbUser);

        const hasPermission = requiredPermissions.every((required) =>
            this.checkRequiredPermission(required, userPermissions),
        );

        if (!hasPermission) {
            this.logger.verbose(
                `PermissionGuard: access denied for user=${user.id}, required=${JSON.stringify(
                    requiredPermissions,
                )}, userPerms=${JSON.stringify(userPermissions)}`,
            );
            throw new ForbiddenException('You do not have permission to access this resource');
        }

        return true;
    }

    /**
     * Safely extract permission codes from DB user object returned by repository.
     * Supports different shapes (defensive).
     */
    private extractPermissionCodes(dbUser: any): string[] {
        try {
            const role = dbUser?.Role ?? dbUser?.role ?? null;
            const rolePerms = role?.permissions ?? [];
            const codes: string[] = [];
            for (const rp of rolePerms) {
                // rp could be RolePermission with nested permission object,
                // or a flat object depending on repo implementation.
                const isActive = rp?.isActive ?? true;
                const code = rp?.permission?.code ?? rp?.permissionCode ?? rp?.code ?? null;
                if (isActive && code) codes.push(code);
            }
            return Array.from(new Set(codes));
        } catch (err) {
            this.logger.error('PermissionGuard: failed to parse user permissions', err as Error);
            return [];
        }
    }

    /**
     * Check a required permission string. Supports:
     * - Exact match: "PERM_A"
     * - OR groups: "PERM_A|PERM_B"  (pass if user has any of them)
     */
    private checkRequiredPermission(required: string, userPermissions: string[]): boolean {
        if (!required) return false;
        // OR-separated by pipe '|'
        if (required.includes('|')) {
            const options = required.split('|').map((s) => s.trim()).filter(Boolean);
            return options.some((opt) => userPermissions.includes(opt));
        }
        return userPermissions.includes(required);
    }
}
