import { Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { AuthRepository } from '../repositories/auth.repository';
import { SignupDto } from '../dtos/signup.dto';
import { errorResponse, successResponse } from 'src/common/utils/response.util';

@Injectable()
export class SignupService {
  constructor(private readonly authRepository: AuthRepository) {}

  async signup(dto: SignupDto) {
    const existing = await this.authRepository.findByEmail(dto.email);
    if (existing) return errorResponse(400, 'Email đã tồn tại', 'EMAIL_EXISTS');
    const hashed = await hash(dto.password, 10);
    const created = await this.authRepository.createNewUser({
      email: dto.email,
      password: hashed,
      fullName: dto.fullName,
      phone: dto.phone,
    });
    const { password, ...data } = created as any;
    return successResponse(201, data, 'Đăng ký thành công');
  }
}


