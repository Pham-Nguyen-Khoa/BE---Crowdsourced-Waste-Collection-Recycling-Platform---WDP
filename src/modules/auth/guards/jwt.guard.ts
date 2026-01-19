import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PrismaService } from "src/libs/prisma/prisma.service";

type JwtPayload = {
    id?: number;
    iat?: number;
    exp?: number;
    [key: string]: any;
};

@Injectable()
export class JWTGuard implements CanActivate {
    private readonly logger = new Logger(JWTGuard.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('Missing authorization token');
        }

        let payload: JwtPayload;
        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.SECRET_KEY,
            });
        } catch (err) {
            this.logger.debug('JWT verification failed', err as Error);
            throw new UnauthorizedException('Invalid or expired token');
        }

        if (!payload?.id) {
            throw new UnauthorizedException('Invalid token payload');
        }

        // check user in DB
        const user = await this.prisma.user.findUnique({
            where: { id: payload.id },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // only allow ACTIVE users
        if (user.status !== 'ACTIVE') {
            throw new ForbiddenException('Account is not active');
        }

        // attach sanitized user info to request
        request['user'] = {
            id: user.id,
            email: user.email,
            roleId: user.roleId,
            ...payload,
        };

        return true;
    }


    private extractTokenFromHeader(request: Request): string | undefined {
        const auth = request?.headers?.authorization;
        if (!auth) return undefined;
        const match = auth.match(/Bearer\s+(.+)/i);
        return match ? match[1] : undefined;
    }
}