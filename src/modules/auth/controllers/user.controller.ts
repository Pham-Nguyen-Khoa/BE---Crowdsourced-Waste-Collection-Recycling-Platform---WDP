import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { routesV1 } from 'src/configs/app.routes';
import { Permissions } from '../guards/permission.decorator';
import { JWTGuard } from '../guards/jwt.guard';
import { PermissionGuard } from '../guards/permissions.guard';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@ApiTags('Users')
@Controller(routesV1.apiversion)
export class UserController {
    constructor(private readonly prisma: PrismaService) { }

    @ApiOperation({ summary: 'Get users (protected)' })
    @UseGuards(JWTGuard, PermissionGuard)
    @Permissions('USER_LIST')
    @Get('users')
    async getUsers() {
        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                roleId: true,
                status: true,
                createdAt: true,
            },
            orderBy: { id: 'asc' },
            take: 100,
        });
        return { data: users };
    }
}


