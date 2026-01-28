import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../libs/prisma/prisma.service'
import { SupabaseService } from '../../supabase/services/supabase.service'
import { UpdateProfileDto, ChangePasswordDto, ProfileResponseDto } from '../dtos/update-profile.dto'
import * as bcrypt from 'bcrypt'
import { errorResponse, successResponse } from 'src/common/utils/response.util'

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name)

    constructor(
        private prisma: PrismaService,
        private supabaseService: SupabaseService
    ) { }

    /**
     * Lấy thông tin profile của user
     */
    async getProfile(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    select: { name: true }
                }
            }
        })

        if (!user) {
            return errorResponse(400, 'Không tìm thấy người dùng')
        }

        return successResponse(200, {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone ?? null,
            avatar: user.avatar ?? null,
            role: user.role.name,
            status: user.status,
            createdAt: user.createdAt,
        }, 'Lấy thông tin profile thành công')
    }

    /**
     * Cập nhật profile (text fields + optional avatar file)
     */
    async updateProfile(userId: number, dto: UpdateProfileDto, avatarFile?: Express.Multer.File) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return {
                success: false,
                statusCode: 404,
                message: 'Không tìm thấy người dùng',
            }
        }

        try {
            let avatarUrl = user.avatar

            // Nếu có file avatar mới, upload lên Supabase
            if (avatarFile) {
                avatarUrl = await this.supabaseService.uploadImage(avatarFile, 'avatars')
            }

            // Cập nhật user
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    fullName: dto.fullName ?? user.fullName,
                    phone: dto.phone ?? user.phone,
                    avatar: avatarUrl,
                },
                include: {
                    role: {
                        select: { name: true }
                    }
                }
            })


            return successResponse(200, {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                phone: updatedUser.phone,
                avatar: updatedUser.avatar,
                role: updatedUser.role.name,
                status: updatedUser.status,
                createdAt: updatedUser.createdAt,
            }, 'Cập nhật profile thành công')
        } catch (error) {
            this.logger.error(`Failed to update profile for user ${userId}`, error)
            return {
                success: false,
                statusCode: 500,
                message: 'Cập nhật profile thất bại: ' + error.message,
            }
        }
    }

    /**
     * Đổi mật khẩu
     */
    async changePassword(userId: number, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return errorResponse(400, 'Không tìm thấy người dùng')
        }

        // Kiểm tra mật khẩu hiện tại
        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password)
        if (!isPasswordValid) {
            return errorResponse(400, 'Mật khẩu hiện tại không đúng')
        }

        // Kiểm tra mật khẩu mới không được trùng mật khẩu cũ
        const isSamePassword = await bcrypt.compare(dto.newPassword, user.password)
        if (isSamePassword) {
            return errorResponse(400, 'Mật khẩu mới không được trùng với mật khẩu hiện tại')
        }

        // Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10)

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            }
        })

        return successResponse(200, null, 'Đổi mật khẩu thành công')
    }
}
