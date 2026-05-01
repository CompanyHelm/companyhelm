import { Worker } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { Config } from "../config/schema.ts";
import { AdminDatabase } from "../db/admin_database.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { WalletRechargeQueueNames } from "../services/wallet/queue_names.ts";
import { CompanyWalletService } from "../services/wallet/service.ts";
import type { WalletRechargeJobPayload } from "../services/wallet/queue.ts";
import { drainLocalWork } from "./local_drain.ts";

/**
 * Consumes the daily subscription recharge scheduler job and delegates period idempotency to the
 * wallet service. The worker intentionally does not repair missing wallets; those are bootstrap
 * invariants and are surfaced as failed company IDs in logs.
 */
@injectable()
export class WalletRechargeWorker {
  private readonly adminDatabase: AdminDatabase;
  private readonly config: Config;
  private readonly logger: PinoLogger;
  private readonly names: WalletRechargeQueueNames;
  private readonly walletService: CompanyWalletService;
  private readonly activeJobIds = new Set<string>();
  private connection?: IORedis;
  private worker?: Worker<WalletRechargeJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(CompanyWalletService) walletService: CompanyWalletService = new CompanyWalletService(),
    @inject(WalletRechargeQueueNames) names: WalletRechargeQueueNames = new WalletRechargeQueueNames(),
  ) {
    this.adminDatabase = adminDatabase;
    this.config = config;
    this.logger = logger.child({ worker: "wallet_recharges" });
    this.names = names;
    this.walletService = walletService;
  }

  start(): void {
    if (this.worker) {
      return;
    }

    this.connection = new IORedis({
      host: this.config.redis.host,
      maxRetriesPerRequest: null,
      password: this.config.redis.password || undefined,
      port: this.config.redis.port,
      username: this.config.redis.username || undefined,
    });
    this.worker = new Worker<WalletRechargeJobPayload>(
      this.names.getQueueName(),
      async (job) => {
        const activeJobId = String(job.id ?? this.names.getRechargeJobName());
        this.activeJobIds.add(activeJobId);
        try {
          const result = await this.walletService.rechargeDueSubscriptions(this.adminDatabase);
          this.logger.info({
            failedCompanyIds: result.failedCompanyIds,
            processedCompanyCount: result.processedCompanyCount,
          }, "processed subscription wallet recharge sweep");
        } finally {
          this.activeJobIds.delete(activeJobId);
        }
      },
      {
        connection: this.connection,
        concurrency: this.config.workers.wallet_recharges.concurrency,
      },
    );
    this.worker.on("error", (error) => {
      this.logger.error({ error }, "wallet recharge worker failed");
    });
  }

  async stop(): Promise<void> {
    const worker = this.worker;
    const connection = this.connection;
    this.worker = undefined;
    this.connection = undefined;

    try {
      await drainLocalWork({
        close: async () => {
          await worker?.close(false);
        },
        getActiveJobIds: () => [...this.activeJobIds],
        logger: this.logger,
        workerName: "wallet_recharges",
      });
    } finally {
      if (connection) {
        await connection.quit();
      }
    }
  }
}
