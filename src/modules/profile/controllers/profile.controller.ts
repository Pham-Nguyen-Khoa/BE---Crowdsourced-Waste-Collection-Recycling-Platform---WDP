import { Controller, Get, Post, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
import { routesV1 } from 'src/configs/app.routes'
import { resourcesV1 } from 'src/configs/app.permission'
import { ApiOperation, ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { ProfileService } from '../services/profile.service'
import { JWTGuard } from 'src/modules/auth/guards/jwt.guard'
import { GetUser } from 'src/modules/auth/guards/get-user.decorator'
import { UpdateProfileDto, ChangePasswordDto } from '../dtos/update-profile.dto'
import { User } from 'generated/prisma/client'

@ApiTags(`${resourcesV1.PROFILE.parent}`)
@Controller(routesV1.apiversion)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @ApiOperation({ summary: resourcesV1.GET_PROFILE.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard)
    @Get(routesV1.profile.getProfile)
    async getProfile(@GetUser() user: User) {
        return await this.profileService.getProfile(user.id)
    }

    @ApiOperation({ summary: resourcesV1.UPDATE_PROFILE.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard)
    @UseInterceptors(FileInterceptor('avatar'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                fullName: {
                    type: 'string',
                    example: 'Nguyễn Văn A',
                    description: 'Họ và tên'
                },
                phone: {
                    type: 'string',
                    example: '0123456789',
                    description: 'Số điện thoại'
                },
                avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'File ảnh avatar (jpg, png, jpeg, webp)'
                }
            }
        }
    })
    @Post(routesV1.profile.updateProfile)
    async updateProfile(
        @GetUser() user: User,
        @Body() dto: UpdateProfileDto,
        @UploadedFile() avatar?: Express.Multer.File
    ) {
        return await this.profileService.updateProfile(user.id, dto, avatar)
    }

    @ApiOperation({ summary: resourcesV1.CHANGE_PASSWORD.displayName })
    @ApiBearerAuth()
    @UseGuards(JWTGuard)
    @Post(routesV1.profile.changePassword)
    async changePassword(@GetUser() user: User, @Body() dto: ChangePasswordDto) {
        return await this.profileService.changePassword(user.id, dto)
    }
}
