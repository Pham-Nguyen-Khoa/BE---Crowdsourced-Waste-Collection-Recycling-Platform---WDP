import { create } from "domain";
import { get } from "http";

const profile = 'profile';

const auth = 'auth';
const permission = 'permissions';
const enterprise = 'enterprise';
const citizen = 'citizen';
const notification = 'notifications';
const baseRoutes = (root: string) => {
    return {
        root,
        getOne: `/${root}/:id`,
        update: `/${root}/:id`,
        delete: `/${root}/:id`,
    };
};
// Api Versions
const v1api = 'api/v1';



export const routesV1 = {
    apiversion: v1api,
    auth: {
        // ...baseRoutes(`${auth}`),
        login: `${auth}/login`,
        login_facebook: `${auth}/login-facebook`,
        signup: `${auth}/signup`,
        refresh: `${auth}/refresh-token`,
        forgotPassword: `${auth}/forgot-password`,
        veifyOTP: `${auth}/verify-otp`,
        resetPassword: `${auth}/reset-password`,
        resendOTP: `${auth}/resend-otp`,
    },
    profile: {
        getProfile: `${profile}`,
        updateProfile: `${profile}`,
        uploadAvatar: `${profile}/avatar`,
        changePassword: `${profile}/change-password`,
    },
    permission: {
        getPermissonByRole: `${permission}/:roleID`,
    },
    enterprise: {
        // Đăng ký doanh nghiệp (Draft + Payment)
        register: `${enterprise}/register`,

        // Payment management
        createPayment: `${enterprise}/payment`,
        getPayment: `${enterprise}/payment/:referenceCode`,
        cancelPayment: `${enterprise}/payment/:referenceCode/cancel`,

        // Subscription Plans
        getPlans: `${enterprise}/plans`,

        // Webhook (for SePay)
        webhook: `${enterprise}/webhook/sepay`,
        testWebhook: `${enterprise}/webhook/sepay/test/:referenceCode`,

        // Enterprise Profile
        getProfile: `${enterprise}/profile`,
        updateProfile: `${enterprise}/profile`,

        acceptedReport: `${enterprise}/reports/:reportId/accept`,
        rejectedReport: `${enterprise}/reports/:reportId/reject`,
        waiting: `${enterprise}/reports/waiting`,
        getDetailWaiting: `${enterprise}/reports/waiting/:id`,

        // Collector management
        createCollector: `${enterprise}/collectors`,
        getCollectors: `${enterprise}/collectors`,
        getCollectorDetail: `${enterprise}/collectors/:id`,
        updateCollector: `${enterprise}/collectors/:id`,
        deleteCollector: `${enterprise}/collectors/:id`,

        // Order acceptance
        toggleOrderAcceptance: `${enterprise}/order-acceptance`,
        getOrderAcceptanceStatus: `${enterprise}/order-acceptance`,
    },
    citizen: {
        // Report management
        createReport: `${citizen}/reports`,
        getReports: `${citizen}/reports`,
        getReport: `${citizen}/reports/:id`,
        cancelReport: `${citizen}/reports/:id/cancel`,
    },
    notification: {
        create: `${notification}`,
        getAll: `${notification}`,
        markRead: `${notification}/:id/read`,
        broadcast: `${notification}/broadcast`,
        broadcastAll: `${notification}/broadcast/all`,
        broadcastByRole: `${notification}/broadcast/role`,
    },

    // Admin
    admin: {
        enterprisesMap: `admin/enterprises/map`,
        enterpriseDetailMap: `admin/enterprises/:id/map`,
    },

}