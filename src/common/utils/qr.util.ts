/**
 * Generate VietQR using VietQR.io API
 */
export class QRGenerator {
    /**
     * Tạo URL QR code từ VietQR.io API
     */
    static generateVietQRUrl(params: {
        bankCode: string;      // Mã BIN ngân hàng (VD: 970422 cho MB Bank)
        accountNumber: string; // Số tài khoản
        amount?: number;       // Số tiền (VNĐ)
        transferContent: string; // Nội dung chuyển khoản
        accountHolder?: string; // Tên chủ tài khoản (optional)
        template?: string;     // Template QR (default: 5HiNLUp)
    }): string {
        const { bankCode, accountNumber, amount, transferContent, accountHolder, template = '5HiNLUp' } = params;

        // Format URL theo VietQR.io API
        let url = `https://api.vietqr.io/image/${bankCode}-${accountNumber}-${template}.jpg`;

        // Thêm query parameters
        const queryParams: string[] = [];

        if (accountHolder) {
            queryParams.push(`accountName=${encodeURIComponent(accountHolder)}`);
        }

        if (amount && amount > 0) {
            queryParams.push(`amount=${Math.floor(amount)}`);
        }

        if (transferContent) {
            queryParams.push(`addInfo=${encodeURIComponent(transferContent)}`);
        }

        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }

        return url;
    }

    /**
     * Generate QR code data cho response API
     */
    static generatePaymentQR(params: {
        bankCode: string;
        accountNumber: string;
        amount: number;
        transferContent: string;
        accountHolder?: string;
        template?: string;
    }) {
        const qrUrl = this.generateVietQRUrl(params);

        return {
            qrUrl, // URL trực tiếp đến QR image
            bankInfo: {
                bankCode: params.bankCode,
                accountNumber: params.accountNumber,
                accountHolder: params.accountHolder || 'CONG TY TNHH WDP',
                amount: params.amount,
                transferContent: params.transferContent
            }
        };
    }
}
