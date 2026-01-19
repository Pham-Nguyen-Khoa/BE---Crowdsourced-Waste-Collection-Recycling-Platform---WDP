import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class VerifyOtpDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '123456', description: 'OTP code' })
    @IsNotEmpty()
    @IsString()
    otp: string;
}


