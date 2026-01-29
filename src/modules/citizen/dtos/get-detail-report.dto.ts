import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReportStatus } from "@prisma/client";

/**
 * Waste item trong report
 */
export class WasteItemResponseDto {
    @ApiProperty({ description: 'Loại rác', example: 'ORGANIC' })
    wasteType: string;

    @ApiProperty({ description: 'Khối lượng (kg)', example: 5.5 })
    weightKg: number;
}

/**
 * Thông tin enterprise (chỉ có khi đơn đã được enterprise ACCEPTED)
 */
export class EnterpriseResponseDto {
    @ApiProperty({ description: 'ID doanh nghiệp', example: 1 })
    id: number;

    @ApiProperty({ description: 'Tên doanh nghiệp', example: 'Công ty Thu Gom A' })
    name: string;

    @ApiPropertyOptional({ description: 'Số điện thoại', example: '0901234567' })
    phone?: string;

    @ApiPropertyOptional({ description: 'Ảnh đại diện', example: 'https://...' })
    avatar?: string;
}

/**
 * Thông tin collector (chỉ có khi đã được ASSIGNED cho collector)
 */
export class CollectorResponseDto {
    @ApiProperty({ description: 'ID người thu gom', example: 1 })
    id: number;

    @ApiProperty({ description: 'Họ và tên', example: 'Nguyễn Văn B' })
    fullName: string;

    @ApiPropertyOptional({ description: 'Số điện thoại', example: '0912345678' })
    phone?: string;

    @ApiPropertyOptional({ description: 'Ảnh đại diện', example: 'https://...' })
    avatar?: string;
}

/**
 * Response chi tiết report cho citizen
 */
export class GetDetailReportResponseDto {
    @ApiProperty({ description: 'ID đơn', example: 19 })
    id: number;

    @ApiProperty({ enum: ReportStatus, description: 'Trạng thái đơn', example: 'PENDING' })
    status: ReportStatus;

    @ApiProperty({ description: 'Địa chỉ thu gom', example: 'công viên tam hiệp' })
    address: string;

    @ApiProperty({ description: 'Vĩ độ', example: 10.940029 })
    latitude: number;

    @ApiProperty({ description: 'Kinh độ', example: 106.872464 })
    longitude: number;

    @ApiProperty({ description: 'Mã tỉnh/thành', example: '01' })
    provinceCode: string;

    @ApiProperty({ description: 'Mã quận/huyện', example: '001' })
    districtCode: string;

    @ApiProperty({ description: 'Mã phường/xã', example: '00001' })
    wardCode: string;

    @ApiPropertyOptional({ description: 'Mô tả thêm', example: 'Có khoảng 5kg rác hữu cơ...' })
    description?: string;

    @ApiProperty({ description: 'Ngày tạo đơn', example: '2026-01-29T10:05:27.692Z' })
    createdAt: Date;

    @ApiProperty({ description: 'Cập nhật lần cuối', example: '2026-01-29T10:21:14.929Z' })
    updatedAt: Date;

    @ApiPropertyOptional({ description: 'Lý do hủy (nếu bị hủy)', example: 'Tôi không có nhu cầu nữa' })
    cancelReason?: string;

    @ApiProperty({ type: [WasteItemResponseDto], description: 'Danh sách loại rác' })
    wasteItems: WasteItemResponseDto[];

    @ApiProperty({ type: [String], description: 'Danh sách ảnh', example: ['https://...'] })
    images: string[];

    @ApiProperty({ 
        type: EnterpriseResponseDto, 
        nullable: true,
        description: 'Thông tin doanh nghiệp (null nếu chưa có enterprise nhận đơn)',
        example: { id: 1, name: 'Công ty A', phone: '0901234567', avatar: 'https://...' }
    })
    enterprise: EnterpriseResponseDto | null;

    @ApiProperty({ 
        type: CollectorResponseDto, 
        nullable: true,
        description: 'Thông tin người thu gom (null nếu chưa có collector được assign)',
        example: { id: 1, fullName: 'Nguyễn Văn B', phone: '0912345678',avatar: 'https://...' }
    })
    collector: CollectorResponseDto | null;
}

