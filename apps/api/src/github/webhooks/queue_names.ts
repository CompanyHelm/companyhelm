import { injectable } from "inversify";

/**
 * Centralizes BullMQ names for GitHub webhook processing so the HTTP ingress path and worker
 * cannot drift as more GitHub event handlers are added.
 */
@injectable()
export class GithubWebhookQueueNames {
  getQueueName(): string {
    return "github-webhooks";
  }

  getJobName(): string {
    return "process-github-webhook";
  }
}
