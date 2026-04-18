import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { Webhooks } from "@octokit/webhooks";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import type { GithubWebhookJobPayload } from "../src/github/webhooks/queue.ts";
import { GithubWebhookSignatureVerifier } from "../src/github/webhooks/signature_verifier.ts";
import { GithubWebhookRoute } from "../src/server/github_webhook_route.ts";

class GithubWebhookRouteTestHarness {
  static createLoggerMock() {
    return {
      child() {
        return {
          info() {},
          warn() {},
        };
      },
    };
  }

  static createConfig(secret?: string): Config {
    return {
      github: {
        webhook_secret: secret,
      },
    } as Config;
  }
}

test("GithubWebhookRoute verifies the raw payload and enqueues accepted deliveries", async () => {
  const app = Fastify();
  const secret = "github-webhook-secret";
  const payload = JSON.stringify({
    action: "created",
    installation: {
      id: 123,
    },
  });
  const signature = await new Webhooks({ secret }).sign(payload);
  const enqueuedDeliveries: GithubWebhookJobPayload[] = [];
  const config = GithubWebhookRouteTestHarness.createConfig(secret);
  const route = new GithubWebhookRoute(
    config,
    {
      async enqueueDelivery(delivery: GithubWebhookJobPayload) {
        enqueuedDeliveries.push(delivery);
      },
    } as never,
    new GithubWebhookSignatureVerifier(config),
    GithubWebhookRouteTestHarness.createLoggerMock() as never,
  );
  route.register(app);

  const response = await app.inject({
    method: "POST",
    url: "/webhooks/github",
    headers: {
      "content-type": "application/json",
      "x-github-delivery": "delivery-1",
      "x-github-event": "installation",
      "x-hub-signature-256": signature,
    },
    payload,
  });

  assert.equal(response.statusCode, 202);
  assert.deepEqual(JSON.parse(response.body), {
    accepted: true,
  });
  assert.equal(enqueuedDeliveries.length, 1);
  assert.equal(enqueuedDeliveries[0]?.deliveryId, "delivery-1");
  assert.equal(enqueuedDeliveries[0]?.eventName, "installation");
  assert.equal(enqueuedDeliveries[0]?.payload, payload);
  assert.equal(enqueuedDeliveries[0]?.signature, signature);
  assert.equal(typeof enqueuedDeliveries[0]?.receivedAt, "string");

  await app.close();
});

test("GithubWebhookRoute rejects deliveries with invalid signatures", async () => {
  const app = Fastify();
  const enqueuedDeliveries: GithubWebhookJobPayload[] = [];
  const config = GithubWebhookRouteTestHarness.createConfig("github-webhook-secret");
  const route = new GithubWebhookRoute(
    config,
    {
      async enqueueDelivery(delivery: GithubWebhookJobPayload) {
        enqueuedDeliveries.push(delivery);
      },
    } as never,
    new GithubWebhookSignatureVerifier(config),
    GithubWebhookRouteTestHarness.createLoggerMock() as never,
  );
  route.register(app);

  const response = await app.inject({
    method: "POST",
    url: "/webhooks/github",
    headers: {
      "content-type": "application/json",
      "x-github-delivery": "delivery-2",
      "x-github-event": "installation",
      "x-hub-signature-256": "sha256=invalid",
    },
    payload: JSON.stringify({
      action: "deleted",
      installation: {
        id: 123,
      },
    }),
  });

  assert.equal(response.statusCode, 401);
  assert.equal(enqueuedDeliveries.length, 0);

  await app.close();
});

test("GithubWebhookRoute rejects requests missing GitHub delivery metadata", async () => {
  const app = Fastify();
  const config = GithubWebhookRouteTestHarness.createConfig("github-webhook-secret");
  const route = new GithubWebhookRoute(
    config,
    {
      async enqueueDelivery() {
        throw new Error("Delivery should not be enqueued.");
      },
    } as never,
    new GithubWebhookSignatureVerifier(config),
    GithubWebhookRouteTestHarness.createLoggerMock() as never,
  );
  route.register(app);

  const response = await app.inject({
    method: "POST",
    url: "/webhooks/github",
    headers: {
      "content-type": "application/json",
    },
    payload: "{}",
  });

  assert.equal(response.statusCode, 400);

  await app.close();
});

test("GithubWebhookRoute skips registration when webhook secret is not configured", async () => {
  const app = Fastify();
  const config = GithubWebhookRouteTestHarness.createConfig();
  const route = new GithubWebhookRoute(
    config,
    {
      async enqueueDelivery() {
        throw new Error("Delivery should not be enqueued.");
      },
    } as never,
    new GithubWebhookSignatureVerifier(config),
    GithubWebhookRouteTestHarness.createLoggerMock() as never,
  );
  route.register(app);

  const response = await app.inject({
    method: "POST",
    url: "/webhooks/github",
    headers: {
      "content-type": "application/json",
    },
    payload: "{}",
  });

  assert.equal(response.statusCode, 404);

  await app.close();
});
