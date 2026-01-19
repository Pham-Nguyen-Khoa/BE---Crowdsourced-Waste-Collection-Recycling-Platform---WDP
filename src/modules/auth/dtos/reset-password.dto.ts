import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MinLength, IsString } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '123456', description: 'OTP code' })
    @IsNotEmpty()
    @IsString()
    otp: string;

    @ApiProperty({ example: 'newSecret123', description: 'New password' })
    @IsNotEmpty()
    @MinLength(6)
    @IsString()
    newPassword: string;
}


