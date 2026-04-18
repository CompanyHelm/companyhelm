import { Webhooks } from "@octokit/webhooks";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";

/**
 * Wraps Octokit's GitHub webhook signature verification with the app configured shared secret.
 * Keeping this separate from the Fastify route makes the HTTP layer a small adapter around a
 * reusable security boundary.
 */
@injectable()
export class GithubWebhookSignatureVerifier {
  private readonly webhooks: Webhooks | null;

  constructor(@inject(Config) config: Config) {
    this.webhooks = config.github.webhook_secret
      ? new Webhooks({
        secret: config.github.webhook_secret,
      })
      : null;
  }

  async verify(payload: string, signature: string): Promise<void> {
    if (!this.webhooks) {
      throw new Error("GitHub webhook secret is not configured.");
    }

    const isValid = await this.webhooks.verify(payload, signature);
    if (!isValid) {
      throw new Error("GitHub webhook signature is invalid.");
    }
  }
}
