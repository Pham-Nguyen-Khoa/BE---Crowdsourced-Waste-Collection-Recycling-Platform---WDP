import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class EnterpriseRoleGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User is not authenticated');
    }

    // projects uses roleId: 2 = ENTERPRISE
    if (user.roleId !== 2) {
      throw new ForbiddenException(
        'Only enterprise accounts can perform this action',
      );
    }

    // Fetch enterpriseId from DB as it might not be in JWT
    const enterprise = await this.prisma.enterprise.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });

    if (!enterprise) {
      throw new ForbiddenException(
        'Enterprise profile not found for this user',
      );
    }

    if (enterprise.status !== 'ACTIVE') {
      throw new ForbiddenException(
        `Enterprise account is currently ${enterprise.status}`,
      );
    }

    // Attach to request for controller use
    request.user.enterpriseId = enterprise.id;

    return true;
  }
}
