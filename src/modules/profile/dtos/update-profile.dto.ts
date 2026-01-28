import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, MinLength, Matches } from 'class-validator'

export class UpdateProfileDto {
    @ApiPropertyOptional({
        example: 'Nguyen Van A',
        description: 'Họ và tên'
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    fullName?: string

    @ApiPropertyOptional({
        example: '0123456789',
        description: 'Số điện thoại'
    })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{10,11}$/, { message: 'Số điện thoại không hợp lệ' })
    phone?: string
}

export class ChangePasswordDto {
    @ApiProperty({
        example: '123456',
        description: 'Mật khẩu hiện tại'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    currentPassword: string

    @ApiProperty({
        example: 'abcdef',
        description: 'Mật khẩu mới'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string
}

export class ProfileResponseDto {
    @ApiProperty({ example: 1 })
    id: number

    @ApiProperty({ example: 'user@gmail.com' })
    email: string

    @ApiProperty({ example: 'Nguyen Van A' })
    fullName: string

    @ApiPropertyOptional({ example: '0123456789' })
    phone?: string | null

    @ApiPropertyOptional({ description: 'URL avatar' })
    avatar?: string | null

    @ApiProperty({ example: 'USER' })
    role: string

    @ApiProperty({ example: 'ACTIVE' })
    status: string

    @ApiProperty({ example: '2026-01-26T00:00:00.000Z' })
    createdAt: Date
}
