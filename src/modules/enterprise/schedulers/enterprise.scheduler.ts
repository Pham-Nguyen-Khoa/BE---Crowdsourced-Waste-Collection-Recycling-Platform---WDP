import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EnterpriseRepository } from '../repositories/enterprise.repository';

@Injectable()
export class EnterpriseScheduler {
    private readonly logger = new Logger(EnterpriseScheduler.name);

    constructor(private readonly enterpriseRepository: EnterpriseRepository) { }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleExpiredPayments() {
        try {
            const expiredPayments = await this.enterpriseRepository.findExpiredPayments();

            for (const payment of expiredPayments) {
                await this.enterpriseRepository.markPaymentAsFailed(payment.referenceCode);
                this.logger.log(`Payment ${payment.referenceCode} marked as FAILED (expired)`);
            }

            if (expiredPayments.length > 0) {
                this.logger.log(`Processed ${expiredPayments.length} expired payments`);
            }
        } catch (error) {
            this.logger.error('Error handling expired payments:', error);
        }
    }


    @Cron(CronExpression.EVERY_DAY_AT_3PM)
    async cleanupPendingEnterprises() {
        try {
            const oldPendingEnterprises = await this.enterpriseRepository.findOldPendingEnterprises();

            for (const enterprise of oldPendingEnterprises) {
                await this.enterpriseRepository.deleteEnterprise(enterprise.id);
                this.logger.log(`Deleted old pending enterprise: ${enterprise.name} (ID: ${enterprise.id})`);
            }

            if (oldPendingEnterprises.length > 0) {
                this.logger.log(`Cleaned up ${oldPendingEnterprises.length} old pending enterprises`);
            }
        } catch (error) {
            this.logger.error('Error cleaning up pending enterprises:', error);
        }
    }


}
