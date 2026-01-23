import { Injectable, Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import { AuthRepository } from '../repositories/auth.repository';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { successResponse } from 'src/common/utils/response.util';
import { MailerService } from '../mail/mailer.service';
import pug from 'pug';
import path from 'path';

@Injectable()
export class ForgotService {
    private readonly logger = new Logger(ForgotService.name);
    private readonly mailer: MailerService;

    constructor(private readonly authRepository: AuthRepository) {
        this.mailer = new MailerService();
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.authRepository.findByEmail(dto.email);
        // Always respond with generic success to avoid user enumeration
        if (!user) return successResponse(200, { message: 'If the email exists, an OTP has been sent' }, 'OK');
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await hash(otp, 10);
        await this.authRepository.createPasswordReset(user.id, otpHash);

        try {
            const templatePath = path.resolve(__dirname, '../templates/forgot-otp.pug');
            const html = pug.renderFile(templatePath, { fullName: user.fullName, otp });
            const text = `Xin chào ${user.fullName || 'Bạn'},\n\nMã OTP của bạn là: ${otp}\nMã này có hiệu lực trong 3 phút.\n\nNếu bạn không yêu cầu mã này, bỏ qua email này.`;
            await this.mailer.sendMail({
                to: user.email,
                subject: 'Mã OTP đặt lại mật khẩu',
                html,
                text,
            });
        } catch (err) {
            this.logger.warn('Failed to send OTP email', err as Error);
        }

        return successResponse(200, { message: 'OTP sent if email exists' }, 'OTP_SENT');
    }
}


