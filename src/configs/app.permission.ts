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

};
