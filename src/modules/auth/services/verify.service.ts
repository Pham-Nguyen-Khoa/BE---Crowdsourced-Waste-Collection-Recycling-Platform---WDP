import { Injectable } from '@nestjs/common';
import { compare } from 'bcrypt';
import { AuthRepository } from '../repositories/auth.repository';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';
import { errorResponse, successResponse } from 'src/common/utils/response.util';

@Injectable()
export class VerifyService {
  constructor(private readonly authRepository: AuthRepository) {}

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) return errorResponse(400, 'User not found', 'NOT_FOUND');
    const record = await this.authRepository.lastOTPByUser(user.id);
    if (!record) return errorResponse(400, 'No OTP found', 'NO_OTP');
    const isMatch = await compare(dto.otp, record.otpHash);
    if (!isMatch) {
      await this.authRepository.updateAttempt(record.id);
      return errorResponse(400, 'Invalid OTP', 'INVALID_OTP');
    }
    return successResponse(200, { ok: true }, 'OTP_VALID');
  }
}


