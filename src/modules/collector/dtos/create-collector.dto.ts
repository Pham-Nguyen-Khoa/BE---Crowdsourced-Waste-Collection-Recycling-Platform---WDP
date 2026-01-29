import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from "class-validator";

export class CreateCollectorDto {
    @ApiProperty({ example: 'collector@example.com', description: 'Email của collector' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Nguyễn Văn Collector', description: 'Họ và tên collector' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: '0901234567', description: 'Số điện thoại', required: false })
    @IsOptional()
    @IsString()
    phone?: string;
}

