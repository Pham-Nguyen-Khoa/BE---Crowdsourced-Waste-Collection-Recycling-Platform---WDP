/**
 * Permission codes - single source of truth.
 * Đồng bộ với cột `code` trong bảng permission (DB).
 * Dùng trong @Permissions() thay vì hardcode string.
 */
export const PermissionCode = {
    CREATE_REPORT: 'CREATE_REPORT',
    REGISTER_ENTERPRISE: 'REGISTER_ENTERPRISE',
    CREATE_NOTIFICATION: 'CREATE_NOTIFICATION',
    CREATE_COLLECTOR: 'CREATE_COLLECTOR',
    DELETE_COLLECTOR: 'DELETE_COLLECTOR',
    UPDATE_COLLECTOR: 'UPDATE_COLLECTOR',
} as const;

export type PermissionCodeType = (typeof PermissionCode)[keyof typeof PermissionCode];

export const resourcesV1 = {
    //  Auth
    LOGIN: {
        name: 'Login',
        displayName: 'Login - Khoa',
        parent: 'Auth',
    },
    VIEW_PROFILE: {
        name: 'View Profile',
        displayName: 'View Profile - Khoa',
        parent: 'Profile',
    },


    // xem profile 

    // Enterprise
    REGISTER_ENTERPRISE: {
        name: 'Register Enterprise',
        displayName: 'Đăng ký doanh nghiệp',
        parent: 'Enterprise',
    },
    GET_PAYMENT: {
        name: 'Get Payment',
        displayName: 'Lấy thông tin thanh toán',
        parent: 'Enterprise',
    },
    REGISTRATION_STATUS: {
        name: 'Registration Status',
        displayName: 'Kiểm tra trạng thái đăng ký',
        parent: 'Enterprise',
    },
    RESUME_REGISTRATION: {
        name: 'Resume Registration',
        displayName: 'Tiếp tục đăng ký',
        parent: 'Enterprise',
    },
    RETRY_PAYMENT: {
        name: 'Retry Payment',
        displayName: 'Thử lại thanh toán',
        parent: 'Enterprise',
    },
    CANCEL_PAYMENT: {
        name: 'Cancel Payment',
        displayName: 'Hủy thanh toán',
        parent: 'Enterprise',
    },
    WEBHOOK_SEPAY: {
        name: 'Webhook SePay',
        displayName: 'Webhook từ SePay',
        parent: 'Enterprise',
    },
    TEST_PAYMENT: {
        name: 'Test Payment',
        displayName: 'Test thanh toán',
        parent: 'Enterprise',
    },

    // Citizen
    CREATE_REPORT: {
        name: 'Create Report',
        displayName: 'Tạo báo cáo thu gom rác',
        parent: 'Citizen',
    },
    GET_REPORTS: {
        name: 'Get Reports',
        displayName: 'Lấy danh sách báo cáo',
        parent: 'Citizen',
    },
    GET_REPORT: {
        name: 'Get Report',
        displayName: 'Lấy chi tiết báo cáo',
        parent: 'Citizen',
    },
    ENTERPRISE_RESPONSE: {
        name: 'Enterprise Response',
        displayName: 'Phản hồi báo cáo từ doanh nghiệp',
        parent: 'Enterprise',
    },
    ENTERPRISE_ACCEPTED: {
        name: 'Enterprise Accepted',
        displayName: 'Doanh nghiệp đã chấp nhận báo cáo',
        parent: 'Enterprise-Reports',
    },
    ENTERPRISE_REJECTED: {
        name: 'Enterprise Rejected',
        displayName: 'Doanh nghiệp đã từ chối báo cáo',
        parent: 'Enterprise-Reports',
    },
    GET_ALL_REPORT_WAITING: {
        name: 'Get All Report Waiting',
        displayName: 'Lấy tất cả đơn báo cáo rác đang đợi phản hồi ',
        parent: 'Enterprise',
    },
    GET_DETAIL_REPORT_WAITING: {
        name: 'Get Detail Report Waiting',
        displayName: 'Lấy chi tiết đơn báo cáo rác đang đợi phản hồi ',
        parent: 'Enterprise',
    },
    // Collector
    CREATE_COLLECTOR: {
        name: 'Create Collector',
        displayName: 'Tạo người thu gom rác',
        parent: 'Collector',
    },
    GET_COLLECTORS: {
        name: 'Get Collectors',
        displayName: 'Lấy danh sách collector',
        parent: 'Collector',
    },
    GET_COLLECTOR_DETAIL: {
        name: 'Get Collector Detail',
        displayName: 'Lấy chi tiết collector',
        parent: 'Collector',
    },
    UPDATE_COLLECTOR: {
        name: 'Update Collector',
        displayName: 'Cập nhật collector',
        parent: 'Collector',
    },
    DELETE_COLLECTOR: {
        name: 'Delete Collector',
        displayName: 'Xóa collector',
        parent: 'Collector',
    },



    // Notification
    NOTIFICATION: {
        name: 'Notification',
        displayName: 'Thông báo',
        parent: 'Notification',
    },
    CREATE_NOTIFICATION: {
        name: 'Create Notification',
        displayName: 'Tạo thông báo mới',
        parent: 'Notification',
    },
    GET_NOTIFICATIONS: {
        name: 'Get Notifications',
        displayName: 'Lấy danh sách thông báo',
        parent: 'Notification',
    },
    MARK_READ_NOTIFICATION: {
        name: 'Mark Read Notification',
        displayName: 'Đánh dấu đã đọc thông báo',
        parent: 'Notification',
    },
    BROADCAST_NOTIFICATION: {
        name: 'Broadcast Notification',
        displayName: 'Gửi thông báo cho nhiều người',
        parent: 'Notification',
    },
    BROADCAST_ALL_NOTIFICATION: {
        name: 'Broadcast All Notification',
        displayName: 'Gửi thông báo cho tất cả người dùng',
        parent: 'Notification',
    },
    BROADCAST_BY_ROLE_NOTIFICATION: {
        name: 'Broadcast By Role Notification',
        displayName: 'Gửi thông báo theo role',
        parent: 'Notification',
    },

    // Profile
    PROFILE: {
        name: 'Profile',
        displayName: 'Hồ sơ người dùng',
        parent: 'Profile',
    },
    GET_PROFILE: {
        name: 'Get Profile',
        displayName: 'Xem hồ sơ cá nhân',
        parent: 'Profile',
    },
    UPDATE_PROFILE: {
        name: 'Update Profile',
        displayName: 'Cập nhật hồ sơ',
        parent: 'Profile',
    },
    UPLOAD_AVATAR: {
        name: 'Upload Avatar',
        displayName: 'Tải lên ảnh đại diện',
        parent: 'Profile',
    },
    CHANGE_PASSWORD: {
        name: 'Change Password',
        displayName: 'Đổi mật khẩu',
        parent: 'Profile',
    },

    // Admin
    GET_ENTERPRISES_MAP: {
        name: 'Get Enterprises Map',
        displayName: 'Lấy danh sách doanh nghiệp trên bản đồ',
        parent: 'Admin',
    },
    GET_ENTERPRISE_DETAIL_MAP: {
        name: 'Get Enterprise Detail Map',
        displayName: 'Lấy chi tiết doanh nghiệp trên bản đồ',
        parent: 'Admin',
    },
    TOGGLE_ORDER_ACCEPTANCE: {
        name: 'Toggle Order Acceptance',
        displayName: 'Bật/tắt trạng thái nhận đơn',
        parent: 'Enterprise',
    },

};
