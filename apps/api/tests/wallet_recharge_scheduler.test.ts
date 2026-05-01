import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Protects the wallet recharge scheduler wiring because monthly credits should be driven by one
 * durable BullMQ scheduler with Postgres idempotency rather than ad-hoc intervals.
 */
class WalletRechargeSchedulerSourceTest {
  static read(relativePath: string): string {
    return readFileSync(new URL(relativePath, import.meta.url), "utf8");
  }
}

test("wallet recharge queue uses the agreed BullMQ job scheduler", () => {
  const source = WalletRechargeSchedulerSourceTest.read("../src/services/wallet/queue.ts")
    + WalletRechargeSchedulerSourceTest.read("../src/services/wallet/queue_names.ts");

  assert.match(source, /upsertJobScheduler\(\s*this\.names\.getDailySchedulerId\(\)/u);
  assert.match(source, /wallet-subscription-recharge-daily/u);
  assert.match(source, /pattern: "0 15 3 \* \* \*"/u);
  assert.match(source, /name: this\.names\.getRechargeJobName\(\)/u);
  assert.match(source, /attempts: 5/u);
});

test("api server starts and stops wallet recharge runtime dependencies", () => {
  const source = WalletRechargeSchedulerSourceTest.read("../src/server/api_server.ts");

  assert.match(source, /walletRechargeQueueService\.upsertDailyRechargeScheduler\(\)/u);
  assert.match(source, /walletRechargeWorker\.start\(\)/u);
  assert.match(source, /await this\.walletRechargeWorker\.stop\(\)/u);
  assert.match(source, /await this\.walletRechargeQueueService\.close\(\)/u);
});
