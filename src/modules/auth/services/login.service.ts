import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { AuthRepository } from '../repositories/auth.repository';
import { LoginDto } from '../dtos/login.dto';
import { errorResponse, successResponse } from 'src/common/utils/response.util';

const EXPIRE_TIME = 60 * 5;

@Injectable()
export class LoginService {
  constructor(private readonly authRepository: AuthRepository, private readonly jwtService: JwtService) { }

  private async getUserPermissions(user: any) {
    return (user?.role?.permissions ?? []).filter((rp) => rp.isActive).map((rp) => rp.permission.code);
  }

  async login(dto: LoginDto) {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) return errorResponse(400, 'Tài khoản không tồn tại', 'NOT_FOUND');
    if (user.status === 'BANNED') return errorResponse(400, 'Tài khoản đã bị khóa', 'BANNED');
    if (user.status === 'DELETED') return errorResponse(400, 'Tài khoản đã bị xóa', 'DELETED');
    const verify = await compare(dto.password, user.password);
    if (!verify) return errorResponse(400, 'Mật khẩu không đúng', 'INCORRECT_PASSWORD');

    const permissions = await this.getUserPermissions(user);
    const payload = { id: user.id, fullName: user.fullName, email: user.email, roleId: user.roleId };
    const accessToken = await this.jwtService.signAsync(payload, { secret: process.env.SECRET_KEY, expiresIn: '1h' });
    const refreshToken = await this.jwtService.signAsync(payload, { secret: process.env.SECRET_KEY_REFRESH, expiresIn: '1d' });

    const result = {
      id: user.id,
      roleId: user.roleId,
      role: user.role.name,
      email: user.email,
      fullName: user.fullName ?? '',
      avatar: user.avatar ?? undefined,
    };

    const total = {
      user: { ...result, permissions },
      backendToken: { accessToken, refreshToken, expiresIn: new Date().setTime(new Date().getTime() + EXPIRE_TIME) },
    };
    return successResponse(200, total, 'Đăng nhập thành công');
  }
}


