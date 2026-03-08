import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { LeaderboardService, LeaderboardCategory, LeaderboardTimeframe } from '../services/leaderboard.service';
import { JWTGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../auth/guards/get-user.decorator';
import { User } from '@prisma/client';
import { routesV1 } from '../../../configs/app.routes';

export class LeaderboardRankDto {
  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: 7 })
  userId: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatar: string | null;

  @ApiProperty({ example: 1500, description: 'Giá trị thành tích (điểm, số đơn, hoặc kg)' })
  value: number;
}

export class LeaderboardResponseDto {
  @ApiProperty({ enum: LeaderboardCategory })
  category: LeaderboardCategory;

  @ApiProperty({ enum: LeaderboardTimeframe })
  timeframe: LeaderboardTimeframe;

  @ApiProperty({ type: [LeaderboardRankDto] })
  topRankings: LeaderboardRankDto[];

  @ApiProperty({ type: LeaderboardRankDto, nullable: true })
  myRank: LeaderboardRankDto | null;
}

@ApiTags('Citizen Leaderboard')
@Controller(routesV1.apiversion)
@UseGuards(JWTGuard)
@ApiBearerAuth()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(routesV1.citizen.getLeaderboard)
  @ApiOperation({ summary: 'Xem bảng xếp hạng Citizen' })
  @ApiQuery({ name: 'category', enum: LeaderboardCategory, required: false, description: 'Hạng mục: POINTS (Điểm), ECO_WARRIORS (Số đơn), WASTE_IMPACT (Khối lượng rác)' })
  @ApiQuery({ name: 'timeframe', enum: LeaderboardTimeframe, required: false, description: 'Thời gian: WEEKLY (Tuần), MONTHLY (Tháng), ALL_TIME (Tất cả)' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getLeaderboard(@GetUser() user: User, @Query() query: any) {
    return await this.leaderboardService.getLeaderboard(user.id, query);
  }
}
