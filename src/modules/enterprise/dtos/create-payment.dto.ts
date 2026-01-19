import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class CreatePaymentDto {
    @ApiProperty({ example: 1, description: 'ID của Enterprise cần kích hoạt' })
    @IsNumber()
    enterpriseId: number;

    @ApiProperty({ example: 1, description: 'ID gói subscription (1: 1 tháng, 2: 6 tháng, 3: 1 năm)' })
    @IsNumber()
    subscriptionPlanConfigId: number;
}
