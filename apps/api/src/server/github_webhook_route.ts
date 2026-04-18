import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { GithubWebhookQueueService } from "../github/webhooks/queue.ts";
import { GithubWebhookSignatureVerifier } from "../github/webhooks/signature_verifier.ts";

type GithubWebhookRequest = FastifyRequest<{
  Body: string | Buffer | Record<string, unknown>;
}>;

/**
 * Owns the public GitHub webhook ingress endpoint. The route keeps the raw JSON body intact for
 * HMAC verification, enqueues verified deliveries, and avoids running business logic on GitHub's
 * request path.
 */
@injectable()
export class GithubWebhookRoute {
  private static readonly ROUTE_PATH = "/webhooks/github";
  private readonly config: Config;
  private readonly logger: ApiLogger;
  private readonly queueService: GithubWebhookQueueService;
  private readonly signatureVerifier: GithubWebhookSignatureVerifier;

  constructor(
    @inject(Config) config: Config,
    @inject(GithubWebhookQueueService) queueService: GithubWebhookQueueService,
    @inject(GithubWebhookSignatureVerifier) signatureVerifier: GithubWebhookSignatureVerifier,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    this.config = config;
    this.queueService = queueService;
    this.signatureVerifier = signatureVerifier;
    this.logger = logger;
  }

  register(app: FastifyInstance): void {
    if (!this.config.github.webhook_secret) {
      this.logger.child({
        route: GithubWebhookRoute.ROUTE_PATH,
      }).info("Skipping GitHub webhook route because webhook secret is not configured.");
      return;
    }

    app.register(async (githubWebhookApp) => {
      githubWebhookApp.addContentTypeParser(
        "application/json",
        { parseAs: "string" },
        (_request, body, done) => {
          done(null, body);
        },
      );

      githubWebhookApp.post(
        GithubWebhookRoute.ROUTE_PATH,
        async (request: GithubWebhookRequest, reply: FastifyReply) => {
          await this.handle(request, reply);
        },
      );
    });
  }

  private async handle(request: GithubWebhookRequest, reply: FastifyReply): Promise<void> {
    const deliveryId = this.readHeader(request, "x-github-delivery");
    const eventName = this.readHeader(request, "x-github-event");
    const signature = this.readHeader(request, "x-hub-signature-256");
    const payload = this.readRawPayload(request.body);

    if (!deliveryId || !eventName || !signature || !payload) {
      await reply.code(400).send({
        error: "GitHub webhook request is missing required headers or body.",
      });
      return;
    }

    try {
      await this.signatureVerifier.verify(payload, signature);
    } catch (error) {
      this.logger.child({
        deliveryId,
        eventName,
        route: GithubWebhookRoute.ROUTE_PATH,
      }).warn({
        error,
      }, "Rejected GitHub webhook with invalid signature.");
      await reply.code(401).send({
        error: "GitHub webhook signature is invalid.",
      });
      return;
    }

    await this.queueService.enqueueDelivery({
      deliveryId,
      eventName,
      payload,
      receivedAt: new Date().toISOString(),
      signature,
    });

    await reply.code(202).send({
      accepted: true,
    });
  }

  private readHeader(request: GithubWebhookRequest, name: string): string | null {
    const value = request.headers[name];
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return typeof value === "string" && value.length > 0 ? value : null;
  }

  private readRawPayload(body: string | Buffer | Record<string, unknown>): string | null {
    if (typeof body === "string") {
      return body;
    }
    if (Buffer.isBuffer(body)) {
      return body.toString("utf8");
    }

    return null;
  }
}
