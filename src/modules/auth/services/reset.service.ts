import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { AuthRepository } from '../repositories/auth.repository';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { errorResponse, successResponse } from 'src/common/utils/response.util';

@Injectable()
export class ResetService {
  constructor(private readonly authRepository: AuthRepository) {}

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) return errorResponse(400, 'User not found', 'NOT_FOUND');
    const record = await this.authRepository.lastOTPByUser(user.id);
    if (!record) return errorResponse(400, 'No OTP found', 'NO_OTP');
    const isMatch = await compare(dto.otp, record.otpHash);
    if (!isMatch) {
      await this.authRepository.updateAttempt(record.id);
      return errorResponse(400, 'Invalid OTP', 'INVALID_OTP');
    }
    const hashed = await hash(dto.newPassword, 10);
    await this.authRepository.updatePasswordByUser(user.id, hashed);
    await this.authRepository.deleteRecordPasswordByUser(user.id);
    return successResponse(200, { ok: true }, 'Password updated');
  }
}


