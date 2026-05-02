import "reflect-metadata";
import { pathToFileURL } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import pino from "pino";
import { ApiContainer } from "../src/api_container.ts";
import { ApiCli } from "../src/cli/api_cli.ts";
import { ConfigLoader } from "../src/config/config_loader.ts";
import { Config, ConfigDocument } from "../src/config/schema.ts";
import { AdminDatabase } from "../src/db/admin_database.ts";
import { DbBootstrap } from "../src/db/bootstrap/bootstrap.ts";
import type { DatabaseTransactionInterface } from "../src/db/database_interface.ts";
import { PlatformAdminAccess } from "../src/db/platform_admin_access.ts";
import {
  agents,
  agentSessions,
  companies,
  companyMembers,
  messageContents,
  platformModelProviderCredentials,
  platformModels,
  sessionMessages,
  sessionTurns,
  users,
} from "../src/db/schema.ts";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import { ApiLogger } from "../src/log/api_logger.ts";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.ts";
import { ModelService } from "../src/services/ai_providers/model_service.ts";
import { PlatformModelProviderCredentialService } from "../src/services/ai_providers/platform_model_provider_credential_service.ts";
import { CompanyBootstrapService } from "../src/services/bootstrap/company.ts";

const LOCAL_DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
const LOCAL_DEV_COMPANY_ID = "00000000-0000-4000-8000-000000000002";
const LOCAL_DEV_PLATFORM_OPENAI_CREDENTIAL_ID = "00000000-0000-4000-8000-000000000003";
const LOCAL_DEV_OPENAI_API_KEY_ENV_VAR = "COMPANYHELM_LOCAL_OPENAI_API_KEY";
const LOCAL_DEV_SEED_OPENAI_FLAG = "--seed-openai-from-env";
const LOCAL_DEV_USER_EMAIL = "andrea.local@companyhelm.dev";
const LOCAL_DEV_COMPANY_SLUG = "companyhelm-local";

type LocalDevUserRecord = {
  id: string;
};

type LocalDevCompanyRecord = {
  id: string;
};

type LocalDevAgentRecord = {
  defaultModelCredentialSource: "platform" | "user_provided";
  defaultModelProviderCredentialModelId: string | null;
  defaultPlatformModelId: string | null;
  defaultReasoningLevel: string | null;
  id: string;
};

type LocalDevPlatformCredentialRecord = {
  id: string;
};

type LocalDevPlatformModelRecord = {
  id: string;
};

type LocalDevSeedOptions = {
  configPath: string;
  shouldSeedOpenAiFromEnv: boolean;
};

type LocalDevMutableDatabase = DatabaseTransactionInterface & {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): {
      onConflictDoNothing(): Promise<unknown>;
    };
  };
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

type LocalDevDemoChatSeedPlanInput = {
  agent: LocalDevAgentRecord;
  baseDate: Date;
  companyId: string;
  userId: string;
};

type LocalDevDemoChatSeedPlan = {
  contents: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  sessionIds: string[];
  sessions: Array<Record<string, unknown>>;
  turns: Array<Record<string, unknown>>;
};

type LocalDevDemoSessionSeedRecord = {
  contents: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  session: Record<string, unknown>;
  turns: Array<Record<string, unknown>>;
};

/**
 * Seeds the deterministic dev-auth user, company, and onboarding Operator agent used by local-dev
 * and local-e2b.
 * It reuses the normal company bootstrap path so the agent is wired to the CompanyHelm-managed
 * model provider and the default CompanyHelm compute provider exactly like product onboarding.
 */
export class LocalDevSeedScript {
  async run(argv: string[] = process.argv): Promise<void> {
    const seedOptions = this.parseSeedOptions(argv);
    const config = new Config(ConfigLoader.load(seedOptions.configPath, ConfigDocument));
    const openAiApiKey = this.resolveOpenAiApiKey(seedOptions);

    const container = new ApiContainer().build(config);
    const logger = pino(ApiLogger.createOptions(config)).child({ component: "local_dev_seed" });
    const adminDatabase = container.get(AdminDatabase);

    try {
      await container.get(DbBootstrap).run();
      if (openAiApiKey) {
        await this.seedPlatformOpenAiCredential(
          adminDatabase,
          openAiApiKey,
          new PlatformModelProviderCredentialService(
            new ModelRegistry(),
            container.get(ModelService),
          ),
        );
      }
      const seeded = await this.seed(adminDatabase, container.get(CompanyBootstrapService));
      logger.info(seeded, "seeded local development data");
    } finally {
      await adminDatabase.close();
    }
  }

  parseSeedOptions(argv: string[]): LocalDevSeedOptions {
    const shouldSeedOpenAiFromEnv = argv.includes(LOCAL_DEV_SEED_OPENAI_FLAG);
    const apiArgv = argv.filter((argument) => argument !== LOCAL_DEV_SEED_OPENAI_FLAG);
    const argumentsDocument = new ApiCli().parse(apiArgv);

    return {
      configPath: argumentsDocument.configPath,
      shouldSeedOpenAiFromEnv,
    };
  }

  resolveOpenAiApiKey(seedOptions: LocalDevSeedOptions): string | null {
    if (!seedOptions.shouldSeedOpenAiFromEnv) {
      return null;
    }

    const openAiApiKey = String(process.env[LOCAL_DEV_OPENAI_API_KEY_ENV_VAR] || "").trim();
    if (!openAiApiKey) {
      throw new Error(`${LOCAL_DEV_OPENAI_API_KEY_ENV_VAR} is required when ${LOCAL_DEV_SEED_OPENAI_FLAG} is passed.`);
    }

    return openAiApiKey;
  }

  async validateOpenAiApiKey(
    openAiApiKey: string,
    platformCredentialService: Pick<PlatformModelProviderCredentialService, "fetchModels">,
  ): Promise<void> {
    await platformCredentialService.fetchModels({
      apiKey: openAiApiKey,
      baseUrl: null,
      modelProvider: "openai",
    });
  }

  private async seedPlatformOpenAiCredential(
    adminDatabase: AdminDatabase,
    openAiApiKey: string,
    platformCredentialService: PlatformModelProviderCredentialService,
  ): Promise<void> {
    const database = adminDatabase.getDatabase();
    if (!database.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    await this.validateOpenAiApiKey(openAiApiKey, platformCredentialService);

    await database.transaction(async (transaction) => {
      await this.upsertPlatformOpenAiCredential(transaction as DatabaseTransactionInterface, openAiApiKey);
    });
    const transactionProvider: TransactionProviderInterface = {
      transaction: async (callback) => database.transaction((transaction) => callback(transaction as never)),
    };

    await platformCredentialService.refreshStoredModels({
      apiKey: openAiApiKey,
      baseUrl: null,
      modelProvider: "openai",
      platformModelProviderCredentialId: LOCAL_DEV_PLATFORM_OPENAI_CREDENTIAL_ID,
      transactionProvider,
    });

    await database.transaction(async (transaction) => {
      await this.setDefaultPlatformOpenAiModel(transaction as DatabaseTransactionInterface);
    });
  }

  private async upsertPlatformOpenAiCredential(
    transaction: DatabaseTransactionInterface,
    openAiApiKey: string,
  ): Promise<void> {
    await PlatformAdminAccess.enable(transaction);
    const [existingCredential] = await transaction
      .select({ id: platformModelProviderCredentials.id })
      .from(platformModelProviderCredentials)
      .where(eq(platformModelProviderCredentials.id, LOCAL_DEV_PLATFORM_OPENAI_CREDENTIAL_ID))
      .limit(1) as LocalDevPlatformCredentialRecord[];
    const now = new Date();
    const database = transaction as LocalDevMutableDatabase;
    if (existingCredential) {
      await database
        .update(platformModelProviderCredentials)
        .set({
          name: "Local OpenAI",
          modelProvider: "openai",
          type: "api_key",
          encryptedApiKey: openAiApiKey,
          baseUrl: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          refreshedAt: null,
          status: "active",
          errorMessage: null,
          updatedAt: now,
        })
        .where(eq(platformModelProviderCredentials.id, existingCredential.id));
      return;
    }

    await transaction
      .insert(platformModelProviderCredentials)
      .values({
        id: LOCAL_DEV_PLATFORM_OPENAI_CREDENTIAL_ID,
        name: "Local OpenAI",
        modelProvider: "openai",
        type: "api_key",
        encryptedApiKey: openAiApiKey,
        baseUrl: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        refreshedAt: null,
        status: "active",
        errorMessage: null,
        createdByUserId: null,
        createdAt: now,
        updatedAt: now,
      });
  }

  private async setDefaultPlatformOpenAiModel(transaction: DatabaseTransactionInterface): Promise<void> {
    await PlatformAdminAccess.enable(transaction);
    const modelRegistry = new ModelRegistry();
    const defaultModelId = modelRegistry.getDefaultModelForProvider("openai");
    const [preferredPlatformModel] = await transaction
      .select({ id: platformModels.id })
      .from(platformModels)
      .where(eq(platformModels.key, `openai:${defaultModelId}`))
      .limit(1) as LocalDevPlatformModelRecord[];
    const [fallbackPlatformModel] = preferredPlatformModel
      ? [preferredPlatformModel]
      : await transaction
        .select({ id: platformModels.id })
        .from(platformModels)
        .where(eq(platformModels.modelProvider, "openai"))
        .limit(1) as LocalDevPlatformModelRecord[];
    if (!fallbackPlatformModel) {
      throw new Error("Failed to seed any OpenAI platform models.");
    }

    const now = new Date();
    const database = transaction as LocalDevMutableDatabase;
    await database
      .update(platformModels)
      .set({
        isDefault: false,
        updatedAt: now,
      })
      .where(eq(platformModels.isDefault, true));
    await database
      .update(platformModels)
      .set({
        isDefault: true,
        updatedAt: now,
      })
      .where(eq(platformModels.id, fallbackPlatformModel.id));
  }

  private async seed(
    adminDatabase: AdminDatabase,
    companyBootstrapService: CompanyBootstrapService,
  ): Promise<{ agentId: string; companyId: string; userId: string }> {
    const database = adminDatabase.getDatabase();
    if (!database.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    return database.transaction(async (transaction) => {
      const userId = await this.ensureUser(transaction as DatabaseTransactionInterface);
      const companyId = await this.ensureCompany(transaction as DatabaseTransactionInterface);
      await this.ensureMembership(transaction as DatabaseTransactionInterface, companyId, userId);
      await companyBootstrapService.ensureCompanySubscriptionWallet(transaction as DatabaseTransactionInterface, {
        companyId,
        plan: "pro",
      });
      await companyBootstrapService.ensureCompanyDefaults(transaction as DatabaseTransactionInterface, companyId);
      const seedAgent = await companyBootstrapService.ensureOnboardingAssets(transaction as DatabaseTransactionInterface, {
        companyId,
        llmSetupStatus: "company_managed",
      });
      const agent = await this.loadSeedAgent(transaction as DatabaseTransactionInterface, seedAgent.id);
      await this.seedDemoChats(transaction as DatabaseTransactionInterface, {
        agent,
        baseDate: new Date(),
        companyId,
        userId,
      });
      const agentId = agent.id;
      return { agentId, companyId, userId };
    });
  }

  buildDemoChatSeedPlan(input: LocalDevDemoChatSeedPlanInput): LocalDevDemoChatSeedPlan {
    const sessionRecords = [
      this.buildDenseMarkdownDemoSession(input),
      this.buildToolOutputDemoSession(input),
      this.buildImagesAndErrorsDemoSession(input),
    ];

    return {
      contents: sessionRecords.flatMap((sessionRecord) => sessionRecord.contents),
      messages: sessionRecords.flatMap((sessionRecord) => sessionRecord.messages),
      sessionIds: sessionRecords.map((sessionRecord) => String(sessionRecord.session.id)),
      sessions: sessionRecords.map((sessionRecord) => sessionRecord.session),
      turns: sessionRecords.flatMap((sessionRecord) => sessionRecord.turns),
    };
  }

  private async seedDemoChats(
    transaction: DatabaseTransactionInterface,
    input: LocalDevDemoChatSeedPlanInput,
  ): Promise<void> {
    const plan = this.buildDemoChatSeedPlan(input);
    const database = transaction as LocalDevMutableDatabase;
    await database
      .delete(agentSessions)
      .where(and(
        eq(agentSessions.companyId, input.companyId),
        inArray(agentSessions.id, plan.sessionIds),
      ));
    await database.insert(agentSessions).values(plan.sessions);
    await database.insert(sessionTurns).values(plan.turns);
    await database.insert(sessionMessages).values(plan.messages);
    await database.insert(messageContents).values(plan.contents);
  }

  private buildDenseMarkdownDemoSession(input: LocalDevDemoChatSeedPlanInput): LocalDevDemoSessionSeedRecord {
    const sessionId = "00000000-0000-4000-8000-000000000101";
    const turnId = "00000000-0000-4000-8000-000000000201";
    const userMessageId = "00000000-0000-4000-8000-000000000301";
    const assistantMessageId = "00000000-0000-4000-8000-000000000302";
    const startedAt = this.offsetDate(input.baseDate, -900);
    const endedAt = this.offsetDate(input.baseDate, -880);
    const assistantMessageAt = this.offsetDate(input.baseDate, -881);

    return {
      contents: [
        this.buildTextContent("00000000-0000-4000-8000-000000000401", input.companyId, userMessageId, "Show me a plan with headings, lists, code, and a table so I can review markdown spacing."),
        this.buildTextContent("00000000-0000-4000-8000-000000000402", input.companyId, assistantMessageId, `Here’s a compact markdown fixture for the /chats transcript.

# Goal

Replace extra transcript whitespace while keeping headings scannable.

## Runtime rule

\`\`\`ts
if (company.usesCompanyHelmManagedModel) {
  await walletService.assertPositiveBalance(company.id);
}
\`\`\`

## Checklist

- Keep paragraph rhythm readable.
- Reduce code-block and list margins.
- Preserve tables and inline \`code\` wrapping.

| Area | Change |
| --- | --- |
| Headings | Smaller top margins in chat transcripts |
| Lists | Tighter item gaps |
| Code | Less padding while retaining borders |

> This blockquote should not create a giant vertical jump.`),
      ],
      messages: [
        this.buildMessage(userMessageId, input.companyId, sessionId, turnId, "user", this.offsetDate(input.baseDate, -899)),
        this.buildMessage(assistantMessageId, input.companyId, sessionId, turnId, "assistant", assistantMessageAt),
      ],
      session: this.buildSession(input, sessionId, "Demo: dense markdown transcript", startedAt, assistantMessageAt),
      turns: [this.buildTurn(turnId, input.companyId, sessionId, input.agent, startedAt, endedAt)],
    };
  }

  private buildToolOutputDemoSession(input: LocalDevDemoChatSeedPlanInput): LocalDevDemoSessionSeedRecord {
    const sessionId = "00000000-0000-4000-8000-000000000102";
    const turnId = "00000000-0000-4000-8000-000000000202";
    const userMessageId = "00000000-0000-4000-8000-000000000303";
    const thinkingMessageId = "00000000-0000-4000-8000-000000000304";
    const toolCallMessageId = "00000000-0000-4000-8000-000000000305";
    const toolResultMessageId = "00000000-0000-4000-8000-000000000306";
    const assistantMessageId = "00000000-0000-4000-8000-000000000307";
    const toolCallId = "local-demo-tool-call-1";
    const startedAt = this.offsetDate(input.baseDate, -720);
    const endedAt = this.offsetDate(input.baseDate, -690);

    return {
      contents: [
        this.buildTextContent("00000000-0000-4000-8000-000000000403", input.companyId, userMessageId, "Run a quick local verification and summarize it."),
        this.buildThinkingContent("00000000-0000-4000-8000-000000000404", input.companyId, thinkingMessageId, "I’ll inspect the package scripts first, then run a focused command."),
        this.buildToolCallContent("00000000-0000-4000-8000-000000000405", input.companyId, toolCallMessageId, toolCallId, "pty_exec", {
          command: "npm run check:web",
          pty_id: "local-demo",
          workingDirectory: "~/workspace/companyhelm",
          yield_time_ms: 1000,
        }),
        this.buildTextContent("00000000-0000-4000-8000-000000000406", input.companyId, toolResultMessageId, "\u001b[32m✓\u001b[0m lint passed\n\u001b[32m✓\u001b[0m typecheck passed\nWeb checks completed."),
        this.buildTerminalContent("00000000-0000-4000-8000-000000000407", input.companyId, toolResultMessageId, "npm run check:web", "~/workspace/companyhelm", "check:web exited 0 in 12.4s"),
        this.buildTextContent("00000000-0000-4000-8000-000000000408", input.companyId, assistantMessageId, `Verification finished:

- Web lint passed.
- Typecheck passed.
- No transcript rendering regressions found in this fixture.`),
      ],
      messages: [
        this.buildMessage(userMessageId, input.companyId, sessionId, turnId, "user", this.offsetDate(input.baseDate, -719)),
        this.buildMessage(thinkingMessageId, input.companyId, sessionId, turnId, "assistant", this.offsetDate(input.baseDate, -716)),
        this.buildMessage(toolCallMessageId, input.companyId, sessionId, turnId, "assistant", this.offsetDate(input.baseDate, -713)),
        this.buildMessage(toolResultMessageId, input.companyId, sessionId, turnId, "toolResult", this.offsetDate(input.baseDate, -704), { toolCallId, toolName: "pty_exec" }),
        this.buildMessage(assistantMessageId, input.companyId, sessionId, turnId, "assistant", this.offsetDate(input.baseDate, -691)),
      ],
      session: this.buildSession(input, sessionId, "Demo: tools and terminal output", startedAt, this.offsetDate(input.baseDate, -691)),
      turns: [this.buildTurn(turnId, input.companyId, sessionId, input.agent, startedAt, endedAt)],
    };
  }

  private buildImagesAndErrorsDemoSession(input: LocalDevDemoChatSeedPlanInput): LocalDevDemoSessionSeedRecord {
    const sessionId = "00000000-0000-4000-8000-000000000103";
    const turnId = "00000000-0000-4000-8000-000000000203";
    const userMessageId = "00000000-0000-4000-8000-000000000308";
    const assistantMessageId = "00000000-0000-4000-8000-000000000309";
    const errorMessageId = "00000000-0000-4000-8000-000000000310";
    const startedAt = this.offsetDate(input.baseDate, -540);
    const endedAt = this.offsetDate(input.baseDate, -520);

    return {
      contents: [
        this.buildTextContent("00000000-0000-4000-8000-000000000409", input.companyId, userMessageId, "Here is a tiny screenshot attachment. Also show how an error response wraps."),
        this.buildImageContent("00000000-0000-4000-8000-000000000410", input.companyId, userMessageId),
        this.buildTextContent("00000000-0000-4000-8000-000000000411", input.companyId, assistantMessageId, `Attachment received. The transcript should keep image previews compact and align this response with normal markdown text.

1. Image preview stays bounded.
2. Ordered lists stay tight.
3. Follow-up errors still inherit the compact markdown rhythm.`),
        this.buildTextContent("00000000-0000-4000-8000-000000000412", input.companyId, errorMessageId, `The demo error renderer is active.

\`wallet_balance\` could not be loaded for this fixture.`),
      ],
      messages: [
        this.buildMessage(userMessageId, input.companyId, sessionId, turnId, "user", this.offsetDate(input.baseDate, -539)),
        this.buildMessage(assistantMessageId, input.companyId, sessionId, turnId, "assistant", this.offsetDate(input.baseDate, -526)),
        this.buildMessage(errorMessageId, input.companyId, sessionId, turnId, "assistant", this.offsetDate(input.baseDate, -521), { errorMessage: "The demo error renderer is active.", isError: true }),
      ],
      session: this.buildSession(input, sessionId, "Demo: images and error states", startedAt, this.offsetDate(input.baseDate, -521)),
      turns: [this.buildTurn(turnId, input.companyId, sessionId, input.agent, startedAt, endedAt)],
    };
  }

  private buildSession(
    input: LocalDevDemoChatSeedPlanInput,
    sessionId: string,
    title: string,
    createdAt: Date,
    lastUserMessageAt: Date,
  ): Record<string, unknown> {
    return {
      agentId: input.agent.id,
      companyId: input.companyId,
      created_at: createdAt,
      currentContextTokens: null,
      currentModelCredentialSource: input.agent.defaultModelCredentialSource,
      currentModelProviderCredentialModelId: input.agent.defaultModelProviderCredentialModelId,
      currentPlatformModelId: input.agent.defaultPlatformModelId,
      currentPlatformModelProviderCredentialModelId: null,
      currentReasoningLevel: input.agent.defaultReasoningLevel ?? "",
      forkedFromTurnId: null,
      id: sessionId,
      inferredTitle: title,
      isCompacting: false,
      isThinking: false,
      lastUserMessageAt,
      maxContextTokens: null,
      ownerUserId: input.userId,
      status: "stopped",
      thinkingText: null,
      updated_at: lastUserMessageAt,
      userSetTitle: title,
    };
  }

  private buildTurn(
    turnId: string,
    companyId: string,
    sessionId: string,
    agent: LocalDevAgentRecord,
    startedAt: Date,
    endedAt: Date,
  ): Record<string, unknown> {
    return {
      companyId,
      endedAt,
      id: turnId,
      platformModelId: agent.defaultModelCredentialSource === "platform" ? agent.defaultPlatformModelId : null,
      platformModelProviderCredentialId: null,
      platformModelProviderCredentialModelId: null,
      sessionId,
      startedAt,
      usageCacheReadCostNanoUsd: 0,
      usageCacheReadCostNanoVirtualUsd: 0,
      usageCacheReadTokens: 0,
      usageCacheWriteCostNanoUsd: 0,
      usageCacheWriteCostNanoVirtualUsd: 0,
      usageCacheWriteTokens: 0,
      usageInputCostNanoUsd: 0,
      usageInputCostNanoVirtualUsd: 0,
      usageInputTokens: 0,
      usageOutputCostNanoUsd: 0,
      usageOutputCostNanoVirtualUsd: 0,
      usageOutputTokens: 0,
      usageRecordedAt: endedAt,
      usageTotalCostNanoUsd: 0,
      usageTotalCostNanoVirtualUsd: 0,
      usageTotalTokens: 0,
    };
  }

  private buildMessage(
    messageId: string,
    companyId: string,
    sessionId: string,
    turnId: string,
    role: "assistant" | "toolResult" | "user",
    createdAt: Date,
    overrides: Partial<Record<string, unknown>> = {},
  ): Record<string, unknown> {
    return {
      companyId,
      createdAt,
      errorMessage: null,
      id: messageId,
      isError: false,
      principalAgentId: null,
      principalSessionId: null,
      principalType: "user",
      role,
      sessionId,
      status: "completed",
      taskRunId: null,
      toolCallId: null,
      toolName: null,
      turnId,
      updatedAt: this.offsetDate(createdAt, role === "toolResult" ? 3 : 1),
      workflowRunId: null,
      ...overrides,
    };
  }

  private buildTextContent(contentId: string, companyId: string, messageId: string, text: string): Record<string, unknown> {
    return this.buildContent(contentId, companyId, messageId, "text", { text });
  }

  private buildThinkingContent(contentId: string, companyId: string, messageId: string, text: string): Record<string, unknown> {
    return this.buildContent(contentId, companyId, messageId, "thinking", { text });
  }

  private buildToolCallContent(
    contentId: string,
    companyId: string,
    messageId: string,
    toolCallId: string,
    toolName: string,
    argumentsValue: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.buildContent(contentId, companyId, messageId, "toolCall", {
      arguments: argumentsValue,
      toolCallId,
      toolName,
    });
  }

  private buildTerminalContent(
    contentId: string,
    companyId: string,
    messageId: string,
    command: string,
    cwd: string,
    text: string,
  ): Record<string, unknown> {
    return this.buildContent(contentId, companyId, messageId, "text", {
      structuredContent: { command, completed: true, cwd, exitCode: 0, sessionId: "local-demo", type: "terminal" },
      text,
    });
  }

  private buildImageContent(contentId: string, companyId: string, messageId: string): Record<string, unknown> {
    return this.buildContent(contentId, companyId, messageId, "image", {
      data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      mimeType: "image/png",
    });
  }

  private buildContent(
    contentId: string,
    companyId: string,
    messageId: string,
    type: "image" | "text" | "thinking" | "toolCall",
    overrides: Partial<Record<string, unknown>>,
  ): Record<string, unknown> {
    const createdAt = new Date();
    return {
      arguments: null,
      companyId,
      createdAt,
      data: null,
      id: contentId,
      messageId,
      mimeType: null,
      structuredContent: null,
      text: null,
      toolCallId: null,
      toolName: null,
      type,
      updatedAt: createdAt,
      ...overrides,
    };
  }

  private offsetDate(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
  }

  private async ensureUser(transaction: DatabaseTransactionInterface): Promise<string> {
    const [existingUser] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, LOCAL_DEV_USER_EMAIL))
      .limit(1) as LocalDevUserRecord[];
    const now = new Date();
    if (existingUser) {
      await (transaction as LocalDevMutableDatabase)
        .update(users)
        .set({
          first_name: "Andrea",
          isPlatformAdmin: true,
          last_name: "Local",
          updated_at: now,
        })
        .where(eq(users.id, existingUser.id));
      return existingUser.id;
    }

    await transaction
      .insert(users)
      .values({
        clerkUserId: null,
        created_at: now,
        email: LOCAL_DEV_USER_EMAIL,
        first_name: "Andrea",
        id: LOCAL_DEV_USER_ID,
        isPlatformAdmin: true,
        last_name: "Local",
        updated_at: now,
      });
    return LOCAL_DEV_USER_ID;
  }

  private async ensureCompany(transaction: DatabaseTransactionInterface): Promise<string> {
    const [existingCompany] = await transaction
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, LOCAL_DEV_COMPANY_SLUG))
      .limit(1) as LocalDevCompanyRecord[];
    if (existingCompany) {
      await (transaction as LocalDevMutableDatabase)
        .update(companies)
        .set({
          name: "CompanyHelm Local",
          plan: "pro",
        })
        .where(eq(companies.id, existingCompany.id));
      return existingCompany.id;
    }

    await transaction
      .insert(companies)
      .values({
        clerkOrganizationId: null,
        id: LOCAL_DEV_COMPANY_ID,
        name: "CompanyHelm Local",
        plan: "pro",
        slug: LOCAL_DEV_COMPANY_SLUG,
      });
    return LOCAL_DEV_COMPANY_ID;
  }

  private async ensureMembership(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    userId: string,
  ): Promise<void> {
    await (transaction as LocalDevMutableDatabase)
      .insert(companyMembers)
      .values({ companyId, userId })
      .onConflictDoNothing();
  }

  private async loadSeedAgent(
    transaction: DatabaseTransactionInterface,
    agentId: string,
  ): Promise<LocalDevAgentRecord> {
    const [agent] = await transaction
      .select({
        defaultModelCredentialSource: agents.defaultModelCredentialSource,
        defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
        defaultPlatformModelId: agents.defaultPlatformModelId,
        defaultReasoningLevel: agents.default_reasoning_level,
        id: agents.id,
      })
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1) as LocalDevAgentRecord[];
    if (!agent) {
      throw new Error("Failed to load the local Operator agent.");
    }

    return agent;
  }

}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await new LocalDevSeedScript().run(process.argv);
}
