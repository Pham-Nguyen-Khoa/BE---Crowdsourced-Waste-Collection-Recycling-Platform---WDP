import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsNumber, IsOptional } from "class-validator";
import { Transform, TransformFnParams } from "class-transformer";

export class SePayWebhookDto {
    @ApiProperty({ example: 'FT26019830803576', description: 'Mã giao dịch từ ngân hàng (transaction ID)' })
    @IsString()
    @IsNotEmpty()
    referenceCode: string; // Đây là transaction ID từ ngân hàng

    @ApiProperty({ example: '115140912829', description: 'ID giao dịch SePay' })
    @IsString()
    @IsOptional()
    transactionId?: string;

    @ApiProperty({ example: 10000, description: 'Số tiền thanh toán' })
    @IsNumber()
    @Transform(({ value }: TransformFnParams) => {
        // Handle both direct amount and transferAmount field
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value);
        return value;
    })
    amount: number;

    // SePay webhook fields - optional để tránh validation error
    @ApiProperty({ example: '0001674486670', description: 'Số tài khoản nhận' })
    @IsString()
    @IsOptional()
    accountNumber?: string;

    @ApiProperty({ example: null, description: 'Sub account' })
    @IsOptional()
    subAccount?: any;

    @ApiProperty({ example: null, description: 'Code' })
    @IsOptional()
    code?: any;

    @ApiProperty({ example: 'MBBank', description: 'Tên gateway/ngân hàng' })
    @IsString()
    @IsOptional()
    gateway?: string;

    @ApiProperty({ example: '2026-01-19 18:40:00', description: 'Thời gian giao dịch' })
    @IsString()
    @IsOptional()
    transactionDate?: string;

    @ApiProperty({ example: '115140912829-Thanh toan PAY001-CHUYEN TIEN-OQCH0006Hkqg-MOMO115140912829MOMO', description: 'Nội dung chuyển khoản' })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ example: 'BankAPINotify 115140912829-Thanh toan PAY001-CHUYEN TIEN-OQCH0006Hkqg-MOMO115140912829MOMO', description: 'Mô tả giao dịch' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'in', description: 'Loại giao dịch (in/out)' })
    @IsString()
    @IsOptional()
    transferType?: string;

    @ApiProperty({ example: 10000, description: 'Số tiền chuyển (duplicate của amount)' })
    @IsNumber()
    @IsOptional()
    @Transform(({ value }: TransformFnParams) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value);
        return value;
    })
    transferAmount?: number;

    @ApiProperty({ example: 20000, description: 'Số dư tích lũy' })
    @IsNumber()
    @IsOptional()
    accumulated?: number;

    @ApiProperty({ example: 39395926, description: 'ID giao dịch SePay' })
    @IsNumber()
    @IsOptional()
    id?: number;

    @ApiProperty({ example: {}, description: 'Dữ liệu webhook thô từ SePay' })
    @IsOptional()
    rawData?: any;
}
