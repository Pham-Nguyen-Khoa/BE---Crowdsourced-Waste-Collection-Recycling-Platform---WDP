import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class EnterpriseGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User must login');
    }

    // Check if role is ENTERPRISE (roleId === 2)
    if (user.roleId !== 2) {
      throw new ForbiddenException(
        'Only enterprise accounts can perform this action',
      );
    }

    // Fetch enterprise record from database based on user.id
    const enterprise = await this.prisma.enterprise.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!enterprise) {
      throw new ForbiddenException('Enterprise record not found for this user');
    }

    // Attach enterpriseId to request['user']
    // To avoid TypeScript error on request.user, we cast it
    request.user.enterpriseId = enterprise.id;

    return true;
  }
}
