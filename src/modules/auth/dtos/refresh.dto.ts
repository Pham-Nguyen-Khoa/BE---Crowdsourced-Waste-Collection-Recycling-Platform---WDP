import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshDto {
    @ApiProperty({ example: 'refresh-token', description: 'Refresh token' })
    @IsNotEmpty()
    @IsString()
    refreshToken: string;
}


