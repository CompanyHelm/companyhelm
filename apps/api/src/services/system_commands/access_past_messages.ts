import type { PastMessageAccessService } from "../session_messages/access_service.ts";
import { PastMessageAccessService as DefaultPastMessageAccessService } from "../session_messages/access_service.ts";
import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { SystemCommandInputReader } from "./input_reader.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

type PastMessageAccessServiceLike = Pick<PastMessageAccessService, "getMessage" | "listMessages" | "searchMessages">;

const VALID_ROLES = new Set(["assistant", "toolResult", "user"]);
const VALID_STATUSES = new Set(["completed", "running"]);
const VALID_PRINCIPAL_TYPES = new Set(["agent_message", "github_webhook", "task", "user", "workflow"]);
const VALID_CONTENT_TYPES = new Set(["image", "text", "thinking", "toolCall"]);

/**
 * Parses and executes the Access past messages system commands. The handler keeps the generic JSON
 * command boundary thin while ensuring every read is scoped with the current session's company and
 * agent identity before delegating to the database read service.
 */
export class AccessPastMessagesSystemCommandService {
  private readonly inputReader = new SystemCommandInputReader();
  private readonly jsonSerializer = new SystemCommandJsonSerializer();
  private readonly pastMessageAccessService: PastMessageAccessServiceLike;

  constructor(pastMessageAccessService: PastMessageAccessServiceLike = new DefaultPastMessageAccessService()) {
    this.pastMessageAccessService = pastMessageAccessService;
  }

  async execute(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    switch (commandId) {
      case "past_messages.list":
        return this.executeList(input, context);
      case "past_messages.get":
        return this.executeGet(input, context);
      case "past_messages.search":
        return this.executeSearch(input, context);
      default:
        throw new Error(`System command ${commandId} is not handled by access past messages.`);
    }
  }

  private async executeList(input: unknown, context: SystemCommandExecutionContext): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const result = await this.pastMessageAccessService.listMessages(context.transactionProvider, {
      after: this.inputReader.optionalString(payload, "after"),
      agentId: context.agentId,
      before: this.inputReader.optionalString(payload, "before"),
      companyId: context.companyId,
      contentTypes: this.optionalStringArray(payload, "contentTypes", VALID_CONTENT_TYPES),
      cursor: this.inputReader.optionalString(payload, "cursor"),
      includeContents: this.inputReader.optionalBoolean(payload, "includeContents"),
      limit: this.inputReader.optionalInteger(payload, "limit"),
      principalTypes: this.optionalStringArray(payload, "principalTypes", VALID_PRINCIPAL_TYPES),
      roles: this.optionalStringArray(payload, "roles", VALID_ROLES),
      sessionId: this.inputReader.optionalString(payload, "sessionId"),
      sort: this.optionalSort(payload),
      statuses: this.optionalStringArray(payload, "statuses", VALID_STATUSES),
    });

    return this.jsonSerializer.serializeRecord(result);
  }

  private async executeGet(input: unknown, context: SystemCommandExecutionContext): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const message = await this.pastMessageAccessService.getMessage(context.transactionProvider, {
      agentId: context.agentId,
      companyId: context.companyId,
      contentTypes: this.optionalStringArray(payload, "contentTypes", VALID_CONTENT_TYPES),
      includeContents: this.inputReader.optionalBoolean(payload, "includeContents"),
      messageId: this.inputReader.requireString(payload, "messageId"),
    });

    return this.jsonSerializer.serializeRecord({ message });
  }

  private async executeSearch(input: unknown, context: SystemCommandExecutionContext): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const result = await this.pastMessageAccessService.searchMessages(context.transactionProvider, {
      after: this.inputReader.optionalString(payload, "after"),
      agentId: context.agentId,
      before: this.inputReader.optionalString(payload, "before"),
      companyId: context.companyId,
      contentTypes: this.optionalStringArray(payload, "contentTypes", VALID_CONTENT_TYPES),
      cursor: this.inputReader.optionalString(payload, "cursor"),
      includeContents: this.inputReader.optionalBoolean(payload, "includeContents"),
      limit: this.inputReader.optionalInteger(payload, "limit"),
      principalTypes: this.optionalStringArray(payload, "principalTypes", VALID_PRINCIPAL_TYPES),
      query: this.inputReader.requireString(payload, "query"),
      roles: this.optionalStringArray(payload, "roles", VALID_ROLES),
      sessionId: this.inputReader.optionalString(payload, "sessionId"),
      sort: this.optionalSort(payload),
      statuses: this.optionalStringArray(payload, "statuses", VALID_STATUSES),
    });

    return this.jsonSerializer.serializeRecord(result);
  }

  private optionalSort(payload: Record<string, unknown>): "asc" | "desc" | undefined {
    const sort = this.inputReader.optionalString(payload, "sort");
    if (sort === undefined) {
      return undefined;
    }
    if (sort !== "asc" && sort !== "desc") {
      throw new Error("sort must be asc or desc.");
    }

    return sort;
  }

  private optionalStringArray(
    payload: Record<string, unknown>,
    key: string,
    allowedValues: Set<string>,
  ): string[] | undefined {
    const values = this.inputReader.optionalStringArray(payload, key);
    if (values === undefined || values === null) {
      return undefined;
    }

    const invalidValue = values.find((value) => !allowedValues.has(value));
    if (invalidValue) {
      throw new Error(`${key} contains unsupported value ${invalidValue}.`);
    }

    return values;
  }
}
