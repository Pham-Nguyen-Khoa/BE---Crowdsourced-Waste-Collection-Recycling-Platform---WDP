import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"


export class LoginDto {
    @ApiProperty({
        example: 'admin@gmail.com', description: 'Email'
    })
    @IsEmail()
    email: string
    @ApiProperty({
        example: '123456', description: 'Password'
    })
    @IsNotEmpty()
    @MinLength(6)
    @IsString()
    password: string
}