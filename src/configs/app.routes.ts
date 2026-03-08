const profile = 'profile';
const auth = 'auth';
const permission = 'permissions';
const enterprise = 'enterprise';
const citizen = 'citizen';
const notification = 'notifications';

// Api Version
const v1api = 'api/v1';

const baseRoutes = (root: string) => {
  return {
    root,
    getOne: `/${root}/:id`,
    update: `/${root}/:id`,
    delete: `/${root}/:id`,
  };
};

export const routesV1 = {
  apiversion: v1api,

  auth: {
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
    // Enterprise Registration
    register: `${enterprise}/register`,

    // Payment
    createPayment: `${enterprise}/payment`,
    getPayment: `${enterprise}/payment/:referenceCode`,
    getPendingPayment: `${enterprise}/pending-payment`,
    createRetryPayment: `${enterprise}/re-create-payment`,
    cancelPayment: `${enterprise}/payment/:referenceCode/cancel`,

    // Plans
    getPlans: `${enterprise}/plans`,

    // Webhook
    webhook: `${enterprise}/webhook/sepay`,
    testWebhook: `${enterprise}/webhook/sepay/test/:referenceCode`,

    // Enterprise profile
    getProfile: `${enterprise}/profile`,
    updateProfile: `${enterprise}/profile`,

    // Reports
    acceptedReport: `${enterprise}/reports/:reportId/accept`,
    rejectedReport: `${enterprise}/reports/:reportId/reject`,
    waiting: `${enterprise}/reports/waiting`,
    getAcceptedReports: `${enterprise}/reports/accepted`,
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

    // Subscription
    getSubscription: `${enterprise}/subscription`,
    renewSubscription: `${enterprise}/subscription/renew`,
    getTransactionHistory: `${enterprise}/transactions`,
  },

  citizen: {
    // Reports
    createReport: `${citizen}/reports`,
    getReports: `${citizen}/reports`,
    getReport: `${citizen}/reports/:id`,
    cancelReport: `${citizen}/reports/:id/cancel`,

    // Complaints
    createComplaint: `${citizen}/complaints`,
    getMyComplaints: `${citizen}/complaints`,

    // Loyalty / Gifts
    getGifts: `${citizen}/gifts`,
    redeemGift: `${citizen}/gifts/redeem`,
    getMyRedemptions: `${citizen}/gifts/redemptions`,
  },

  notification: {
    create: `${notification}`,
    getAll: `${notification}`,
    markRead: `${notification}/:id/read`,
    broadcast: `${notification}/broadcast`,
    broadcastAll: `${notification}/broadcast/all`,
    broadcastByRole: `${notification}/broadcast/role`,
  },

  admin: {
    enterprisesMap: `admin/enterprises/map`,
    enterpriseDetailMap: `admin/enterprises/:id/map`,
  },
};