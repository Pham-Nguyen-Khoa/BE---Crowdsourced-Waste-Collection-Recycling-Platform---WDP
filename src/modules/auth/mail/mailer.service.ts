import * as nodemailer from 'nodemailer';

type SendMailOptions = {
    to: string;
    subject: string;
    html?: string;
    text?: string;
};

export class MailerService {
    private transporter: nodemailer.Transporter;
    private from: string;

    constructor() {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || '587');
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        this.from = process.env.EMAIL_FROM || `no-reply@localhost`;

        if (!host || !user || !pass) {
            // Don't throw here; allow app to start but sendMail will error if used.
            this.transporter = null as any;
            return;
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for other ports
            auth: {
                user,
                pass,
            },
        });
    }

    async sendMail(opts: SendMailOptions) {
        if (!this.transporter) {
            throw new Error('Mailer not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS env variables.');
        }

        const info = await this.transporter.sendMail({
            from: this.from,
            to: opts.to,
            subject: opts.subject,
            text: opts.text,
            html: opts.html,
        });
        return info;
    }
}


