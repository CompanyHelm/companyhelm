import assert from "node:assert/strict";
import { test } from "vitest";
import { EnhancedLoggingNames } from "../src/log/enhanced_logging_names.ts";
import { EnhancedLoggingService } from "../src/log/enhanced_logging_service.ts";

test("EnhancedLoggingService honors component, session, and expiry scopes", async () => {
  const names = new EnhancedLoggingNames();
  const configStore = new Map<string, string>();
  configStore.set(
    names.getCompanyConfigKey("company-1"),
    JSON.stringify({
      components: ["session_process_cleanup"],
      enabled: true,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sessionIds: ["session-1"],
    }),
  );

  const service = new EnhancedLoggingService(
    {
      async getClient() {
        return {
          async get(key: string) {
            return configStore.get(key) ?? null;
          },
        };
      },
      async getSubscriberClient() {
        return {
          async subscribe() {
            return undefined;
          },
        };
      },
    } as never,
    {
      child() {
        return {
          error() {
            return undefined;
          },
        };
      },
    } as never,
    names,
  );

  await service.refreshCompanyConfig("company-1");

  assert.equal(service.shouldLogEnhanced("company-1", "session_process_cleanup", "session-1"), true);
  assert.equal(service.shouldLogEnhanced("company-1", "session_prompt_tail", "session-1"), false);
  assert.equal(service.shouldLogEnhanced("company-1", "session_process_cleanup", "session-2"), false);
  assert.equal(service.shouldLogEnhanced("company-2", "session_process_cleanup", "session-1"), false);

  configStore.set(
    names.getCompanyConfigKey("company-1"),
    JSON.stringify({
      enabled: true,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    }),
  );

  await service.refreshCompanyConfig("company-1");

  assert.equal(service.shouldLogEnhanced("company-1", "session_process_cleanup", "session-1"), false);
});

test("EnhancedLoggingService refreshes cached company config after redis invalidation", async () => {
  const names = new EnhancedLoggingNames();
  const configStore = new Map<string, string>();
  const listeners: Array<(message: string, channel: string) => void> = [];
  configStore.set(
    names.getCompanyConfigKey("company-1"),
    JSON.stringify({
      components: ["session_process_cleanup"],
      enabled: true,
    }),
  );

  const service = new EnhancedLoggingService(
    {
      async getClient() {
        return {
          async get(key: string) {
            return configStore.get(key) ?? null;
          },
        };
      },
      async getSubscriberClient() {
        return {
          async subscribe(_channel: string, listener: (message: string, channel: string) => void) {
            listeners.push(listener);
            return undefined;
          },
        };
      },
    } as never,
    {
      child() {
        return {
          error() {
            return undefined;
          },
        };
      },
    } as never,
    names,
  );

  await service.refreshCompanyConfig("company-1");
  assert.equal(service.shouldLogEnhanced("company-1", "session_process_cleanup", "session-1"), true);

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(listeners.length, 1);

  configStore.set(
    names.getCompanyConfigKey("company-1"),
    JSON.stringify({
      components: ["session_process_cleanup"],
      enabled: false,
    }),
  );
  listeners[0]!("company-1", names.getInvalidationChannel());

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(service.shouldLogEnhanced("company-1", "session_process_cleanup", "session-1"), false);
});
