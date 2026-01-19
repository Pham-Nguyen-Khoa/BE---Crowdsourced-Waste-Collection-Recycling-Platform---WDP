import { HttpException } from '@nestjs/common';

/**
 * Thành công chung (GET, PUT, PATCH)
 */
export function successResponse(
    statusCode: number = 200,
    data: any = null,
    message = 'Thành công',
) {
    return {
        success: true,
        statusCode,
        message,
        data,
    };
}

/**
 * Thành công khi tạo mới (POST)
 */
export function createdResponse(data: any = null, message = 'Tạo mới thành công') {
    return successResponse(201, data, message);
}

/**
 * Thành công không có nội dung (DELETE thành công, update không cần trả về gì)
 */
export function noContentResponse(message = 'Xử lý thành công') {
    return {
        success: true,
        statusCode: 204,
        message,
        data: null,
    };
}

/**
 * Lỗi chung
 */
export function errorResponse(
    statusCode: number,
    message = 'Đã xảy ra lỗi',
    error: any = null,
): never {
    throw new HttpException(
        {
            success: false,
            statusCode,
            message,
            error,
        },
        statusCode,
    );
}

/**
 * 400 - Dữ liệu không hợp lệ
 */
export function badRequest(message = 'Dữ liệu không hợp lệ', error: any = null): never {
    return errorResponse(400, message, error);
}

/**
 * 401 - Không xác thực
 */
export function unauthorized(message = 'Chưa xác thực'): never {
    return errorResponse(401, message);
}

/**
 * 403 - Không có quyền
 */
export function forbidden(message = 'Bạn không có quyền truy cập'): never {
    return errorResponse(403, message);
}

/**
 * 404 - Không tìm thấy
 */
export function notFound(message = 'Không tìm thấy dữ liệu'): never {
    return errorResponse(404, message);
}

/**
 * 409 - Conflict dữ liệu (VD: đăng ký trùng email)
 */
export function conflict(message = 'Dữ liệu bị trùng'): never {
    return errorResponse(409, message);
}

/**
 * 422 - Validate fail
 */
export function validationError(errors: any, message = 'Dữ liệu không hợp lệ'): never {
    return errorResponse(422, message, errors);
}

/**
 * 500 - Lỗi hệ thống
 */
export function internalServerError(message = 'Lỗi hệ thống', error: any = null): never {
    return errorResponse(500, message, error);
}

/**
 * Dữ liệu phân trang
 */
export function paginationResponse<T>(
    data: T[],
    total: number,
    page: number,
    size: number,
    message = 'Lấy danh sách thành công',
) {
    return {
        success: true,
        statusCode: 200,
        message,
        data,
        meta: {
            total,
            page,
            size,
        },
    };
}