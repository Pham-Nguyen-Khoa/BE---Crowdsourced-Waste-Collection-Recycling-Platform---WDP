import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { CreateCollectorDto } from "../dtos/create-collector.dto";
import { MailerService } from "src/modules/auth/mail/mailer.service";
import { errorResponse, successResponse } from "src/common/utils/response.util";
import { hash } from "bcrypt";

@Injectable()
export class CreateCollectorService {
    private readonly logger = new Logger(CreateCollectorService.name);
    private readonly COLLECTOR_ROLE_ID = 3;

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailerService: MailerService,
    ) { }


    private generateRandomPassword(length = 10): string {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%^&*';
        const allChars = uppercase + lowercase + numbers + special;

        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];

        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    private async sendCollectorAccountEmail(
        email: string,
        fullName: string,
        password: string,
        enterpriseName: string
    ): Promise<void> {
        const subject = 'Thông tin tài khoản Collector - Waste Delivery Platform';
        const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông tin tài khoản Collector</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Waste Delivery Platform</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Chào mừng bạn đến với hệ thống!</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 35px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Xin chào <strong style="color: #2e7d32;">${fullName}</strong>,
                            </p>
                            <p style="margin: 0 0 25px; color: #555555; font-size: 15px; line-height: 1.6;">
                                Doanh nghiệp <strong>${enterpriseName}</strong> đã tạo tài khoản Collector cho bạn trên hệ thống <strong>Waste Delivery Platform</strong>.
                            </p>

                            <!-- Credentials Box -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8faf8; border: 2px solid #e8f5e9; border-radius: 10px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="margin: 0 0 20px; color: #2e7d32; font-size: 18px; font-weight: 600; text-align: center;">
                                            🔑 Thông tin đăng nhập
                                        </p>
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                                    <span style="color: #666666; font-size: 14px;">Email:</span>
                                                    <br>
                                                    <strong style="color: #333333; font-size: 16px;">${email}</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <span style="color: #666666; font-size: 14px;">Mật khẩu:</span>
                                                    <br>
                                                    <code style="display: inline-block; background-color: #fff3e0; color: #e65100; padding: 8px 16px; border-radius: 6px; font-size: 18px; font-weight: 600; letter-spacing: 1px; margin-top: 5px;">${password}</code>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Warning -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 6px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 18px 20px;">
                                        <p style="margin: 0; color: #f57c00; font-size: 14px; line-height: 1.5;">
                                            ⚠️ <strong>Lưu ý:</strong> Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu để đảm bảo bảo mật tài khoản.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="#" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                            Đăng nhập ngay
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f5f5f5; padding: 30px 35px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">
                                Bạn nhận được email này vì doanh nghiệp đã tạo tài khoản cho bạn.
                            </p>
                            <p style="margin: 0; color: #666666; font-size: 14px;">
                                © 2026 Waste Delivery Platform. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        try {
            await this.mailerService.sendMail({ to: email, subject, html });
        } catch (error) {
            this.logger.error(`Failed to send account email to ${email}:`, error);
        }
    }


    async createCollector(userId: number, dto: CreateCollectorDto) {
        try {
            const enterprise = await this.prisma.enterprise.findFirst({
                where: { userId: userId, deletedAt: null, },
                include: { user: true }
            });

            if (!enterprise) {
                return errorResponse(400, 'Không tìm thấy doanh nghiệp');
            }
            if (enterprise.status === "BANNED") {
                return errorResponse(400, 'Doanh nghiệp đã bị cấm');
            }
            if (enterprise.status === "EXPIRED") {
                return errorResponse(400, 'Doanh nghiệp đã hết hạn');
            }

            const existingUser = await this.prisma.user.findFirst({
                where: { email: dto.email, deletedAt: null }
            });

            if (existingUser) {
                return errorResponse(400, 'Email đã được sử dụng');
            }

            const rawPassword = this.generateRandomPassword(12);
            const hashedPassword = await hash(rawPassword, 10);

            const result = await this.prisma.$transaction(async (tx) => {
                const newUser = await (tx as any).user.create({
                    data: {
                        email: dto.email,
                        password: hashedPassword,
                        fullName: dto.fullName,
                        phone: dto.phone ?? null,
                        roleId: this.COLLECTOR_ROLE_ID,
                        status: 'ACTIVE',
                    }
                });

                const newCollector = await (tx as any).collector.create({
                    data: {
                        userId: newUser.id,
                        enterpriseId: enterprise.id,
                    }
                });

                await (tx as any).collectorStatus.create({
                    data: {
                        collectorId: newCollector.id,
                        status: 'OFFLINE',
                    }
                });

                return { user: newUser, collector: newCollector };
            });

            this.sendCollectorAccountEmail(
                dto.email,
                dto.fullName,
                rawPassword,
                enterprise.name
            );


            return successResponse(200, {
                collectorId: result.collector.id,
                email: dto.email,
                fullName: dto.fullName,
                phone: dto.phone,
                enterpriseName: enterprise.name,
            }, 'Tạo collector thành công. Thông tin tài khoản đã được gửi qua email.');

        } catch (error) {
            this.logger.error(`Error creating collector:`, error);
            return errorResponse(400, error.message);
        }
    }
}

