import { injectable } from "inversify";

/**
 * Owns the Redis pub/sub channel names used by the inbox so websocket subscribers can reload the
 * open human-question list whenever an inbox item changes state.
 */
@injectable()
export class AgentInboxPubSubNames {
  getHumanQuestionsUpdateChannel(): string {
    return "inbox:human_questions:update";
  }

  getHumanQuestionsUpdatePattern(): string {
    return this.getHumanQuestionsUpdateChannel();
  }
}
