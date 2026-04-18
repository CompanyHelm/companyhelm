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
  private readonly webhooks: Webhooks;

  constructor(@inject(Config) config: Config) {
    this.webhooks = new Webhooks({
      secret: config.github.webhook_secret,
    });
  }

  async verify(payload: string, signature: string): Promise<void> {
    const isValid = await this.webhooks.verify(payload, signature);
    if (!isValid) {
      throw new Error("GitHub webhook signature is invalid.");
    }
  }
}
