import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class CollectorRoleGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User is not authenticated');
    }

    // projects uses roleId: 3 = COLLECTOR
    if (user.roleId !== 3) {
      throw new ForbiddenException(
        'Only collector accounts can perform this action',
      );
    }

    // Fetch collector profile to ensure it exists and attach collectorId
    const collector = await this.prisma.collector.findUnique({
      where: { userId: user.id, deletedAt: null },
      select: { id: true, isActive: true },
    });

    if (!collector) {
      throw new ForbiddenException('Collector profile not found for this user');
    }

    if (!collector.isActive) {
      throw new ForbiddenException('Collector account is currently inactive');
    }

    // Attach collectorId to request for service use
    request.user.collectorId = collector.id;

    return true;
  }
}
