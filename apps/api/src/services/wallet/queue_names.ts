/**
 * Centralizes BullMQ naming for subscription wallet recharges so scheduler setup and workers never
 * drift on queue, scheduler, or job names.
 */
export class WalletRechargeQueueNames {
  getQueueName(): string {
    return "wallet_recharges";
  }

  getDailySchedulerId(): string {
    return "wallet-subscription-recharge-daily";
  }

  getRechargeJobName(): string {
    return "wallet-subscription-recharge-sweep";
  }
}
