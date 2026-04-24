import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

/**
 * Starts the chat-scoped credential setup handoff that the web transcript renders as an inline
 * modal launcher tied to the current session.
 */
export class ModelProviderCredentialSystemCommandService {
  private readonly jsonSerializer = new SystemCommandJsonSerializer();

  async execute(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    void input;

    switch (commandId) {
      case "model_provider_credential.start":
        return this.jsonSerializer.serializeRecord({
          sourceSessionId: context.sessionId,
          status: "waiting_for_user",
        });
      default:
        throw new Error(`System command ${commandId} is not handled by model provider credential management.`);
    }
  }
}
