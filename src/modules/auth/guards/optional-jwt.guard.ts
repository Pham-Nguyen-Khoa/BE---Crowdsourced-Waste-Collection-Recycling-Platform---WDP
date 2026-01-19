// import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
// import { JwtService } from "@nestjs/jwt";
// import { Request } from "express";
// // import { PrismaService } from "src/libs/prisma/prisma.service";

// type JwtPayload = {
//   id?: number;
//   iat?: number;
//   exp?: number;
//   [k: string]: any;
// };

// @Injectable()
// export class OptionalJWTGuard implements CanActivate {
//   private readonly logger = new Logger(OptionalJWTGuard.name);

//   constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request = context.switchToHttp().getRequest<Request>();
//     const token = this.extractTokenFromHeader(request);
//     if (!token) {
//       (request as any).user = null;
//       return true;
//     }

//     try {
//       const payload = (await this.jwtService.verifyAsync(token, { secret: process.env.SECRET_KEY })) as JwtPayload;
//       if (!payload?.id) {
//         (request as any).user = null;
//         return true;
//       }

//       const user = await this.prisma.user.findFirst({
//         where: { id: payload.id, deletedAt: null },
//       });

//       if (!user || user.status !== "ACTIVE") {
//         (request as any).user = null;
//         return true;
//       }

//       // attach sanitized user
//       (request as any).user = {
//         id: user.id,
//         email: user.email,
//         roleId: user.roleId,
//       };
//     } catch (err) {
//       this.logger.debug('OptionalJWTGuard: token invalid or decode failed', err as Error);
//       (request as any).user = null;
//     }

//     return true;
//   }

//   private extractTokenFromHeader(request: Request): string | undefined {
//     const auth = request?.headers?.authorization;
//     if (!auth) return undefined;
//     const match = auth.match(/Bearer\s+(.+)/i);
//     return match ? match[1] : undefined;
//   }
// }
