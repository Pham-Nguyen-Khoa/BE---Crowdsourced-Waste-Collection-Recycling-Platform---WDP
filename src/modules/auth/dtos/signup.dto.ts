import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from "class-validator";

export class SignupDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'secret123', description: 'Password' })
    @IsNotEmpty()
    @MinLength(6)
    @IsString()
    password: string;

    @ApiProperty({ example: 'Nguyen Van A', description: 'Full name' })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiProperty({ example: '+84901234567', description: 'Phone number' })
    @IsOptional()
    @IsString()
    phone?: string;
}


