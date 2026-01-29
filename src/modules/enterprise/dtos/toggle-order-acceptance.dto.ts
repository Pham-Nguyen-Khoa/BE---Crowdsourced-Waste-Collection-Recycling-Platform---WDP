import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty } from "class-validator";

export class ToggleOrderAcceptanceDto {
    @ApiProperty({ description: 'Trạng thái nhận đơn (true = bật, false = tắt)', example: true })
    @IsBoolean()
    @IsNotEmpty()
    isAcceptingOrders: boolean;
}

