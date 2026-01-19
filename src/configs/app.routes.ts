
const auth = 'auth';
const permission = 'permissions';
const enterprise = 'enterprise';
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
        // ...baseRoutes(`${auth}`),
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
    },

}