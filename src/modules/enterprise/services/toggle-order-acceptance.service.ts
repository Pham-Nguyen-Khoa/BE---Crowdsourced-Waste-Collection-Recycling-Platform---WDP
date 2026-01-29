import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { errorResponse, successResponse } from "src/common/utils/response.util";
import { ToggleOrderAcceptanceDto } from "../dtos/toggle-order-acceptance.dto";

@Injectable()
export class ToggleOrderAcceptanceService {
    private readonly logger = new Logger(ToggleOrderAcceptanceService.name);

    constructor(private readonly prisma: PrismaService) { }

    async toggleOrderAcceptance(userId: number, dto: ToggleOrderAcceptanceDto) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null },
                include: { user: { select: { status: true } } }
            });

            if (!enterprise) {
                return errorResponse(400, 'Không tìm thấy doanh nghiệp');
            }

            if (enterprise.status === 'BANNED') {
                return errorResponse(400, 'Doanh nghiệp đã bị cấm');
            }

            if (enterprise.user.status === 'BANNED') {
                return errorResponse(400, 'Tài khoản đã bị cấm');
            }

            const updated = await this.prisma.enterprise.update({
                where: { id: enterprise.id },
                data: {
                    status: dto.isAcceptingOrders ? 'ACTIVE' : 'OFFLINE'
                },
                select: {
                    id: true,
                    name: true,
                    status: true,
                }
            });

            const message = dto.isAcceptingOrders
                ? 'Đã bật trạng thái nhận đơn'
                : 'Đã tắt trạng thái nhận đơn';

            return successResponse(200, {
                enterpriseId: updated.id,
                name: updated.name,
                status: updated.status,
                isAcceptingOrders: dto.isAcceptingOrders,
            }, message);

        } catch (error) {
            this.logger.error('Error toggling order acceptance:', error);
            return errorResponse(500, error.message);
        }
    }

    async getOrderAcceptanceStatus(userId: number) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId, deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    status: true,
                }
            });

            if (!enterprise) {
                return errorResponse(400, 'Không tìm thấy doanh nghiệp');
            }

            return successResponse(200, {
                enterpriseId: enterprise.id,
                name: enterprise.name,
                status: enterprise.status,
                isAcceptingOrders: enterprise.status === 'ACTIVE',
            }, 'Lấy trạng thái nhận đơn thành công');

        } catch (error) {
            this.logger.error('Error getting order acceptance status:', error);
            return errorResponse(500, error.message);
        }
    }
}

