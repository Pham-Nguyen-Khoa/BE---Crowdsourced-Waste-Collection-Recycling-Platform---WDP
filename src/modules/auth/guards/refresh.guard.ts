import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";


@Injectable()
export class RefreshGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        console.log('vao guard');
        const request = context.switchToHttp().getRequest();
        const token = await this.extractRefreshTokenFromHeader(request);
        if (!token) throw new UnauthorizedException();
        try {
            const secret = this.configService.get<string>('SECRET_KEY_REFRESH')

            const payload = await this.jwtService.verify(token, { secret });
            request['user'] = payload;
        } catch {
            throw new UnauthorizedException();
        }
        return true
    }


    private extractRefreshTokenFromHeader(request: Request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        console.log(token)
        return type === 'Bearer' ? token : undefined;
    }
}