import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshDto } from '../dtos/refresh.dto';
import { successResponse, errorResponse } from 'src/common/utils/response.util';

@Injectable()
export class RefreshService {
  constructor(private readonly jwtService: JwtService) { }

  async refresh(dto: RefreshDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, { secret: process.env.SECRET_KEY_REFRESH });
      const accessToken = await this.jwtService.signAsync({ id: payload.id, email: payload.email }, { secret: process.env.SECRET_KEY, expiresIn: '1d' });
      return successResponse(200, accessToken, 'Refreshed');
    } catch (err) {
      return errorResponse(401, 'Invalid refresh token', 'INVALID_REFRESH');
    }
  }
}


