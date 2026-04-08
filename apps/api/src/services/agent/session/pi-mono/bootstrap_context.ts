import type { Logger as PinoLogger } from "pino";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { SystemPromptTemplateContext } from "../../../../prompts/system_prompt_template_context.ts";
import type {
  AgentEnvironmentTemplate,
  ComputeProvider,
} from "../../../environments/providers/provider_interface.ts";
import { AgentEnvironmentPromptScope } from "../../../environments/prompt_scope.ts";

type AgentSessionBootstrapContextInput = {
  agentId: string;
  agentName: string;
  agentSystemPrompt: string | null;
  companyBaseSystemPrompt: string | null;
  companyId: string;
  companyName: string;
  computeProviderDefinitionId: string;
  environmentProvider: ComputeProvider;
  environmentTemplate: AgentEnvironmentTemplate;
  logger: PinoLogger;
  modelApiKey: string;
  modelId: string;
  modelProviderId: string;
  promptScope: AgentEnvironmentPromptScope;
  reasoningLevel: string | null;
  sessionId: string;
  transactionProvider: TransactionProviderInterface;
};

/**
 * Carries the stable session facts and assembly-time dependencies needed to build one PI Mono
 * runtime. Modules, prompt loading, and tool assembly all read from this object so the session
 * manager no longer has to thread a long list of loosely related constructor arguments around.
 */
export class AgentSessionBootstrapContext {
  readonly agentId: string;
  readonly agentName: string;
  readonly agentSystemPrompt: string | null;
  readonly companyBaseSystemPrompt: string | null;
  readonly companyId: string;
  readonly companyName: string;
  readonly computeProviderDefinitionId: string;
  readonly environmentProvider: ComputeProvider;
  readonly environmentTemplate: AgentEnvironmentTemplate;
  readonly logger: PinoLogger;
  readonly modelApiKey: string;
  readonly modelId: string;
  readonly modelProviderId: string;
  readonly promptScope: AgentEnvironmentPromptScope;
  readonly reasoningLevel: string | null;
  readonly sessionId: string;
  readonly transactionProvider: TransactionProviderInterface;

  constructor(input: AgentSessionBootstrapContextInput) {
    this.agentId = input.agentId;
    this.agentName = input.agentName;
    this.agentSystemPrompt = input.agentSystemPrompt;
    this.companyBaseSystemPrompt = input.companyBaseSystemPrompt;
    this.companyId = input.companyId;
    this.companyName = input.companyName;
    this.computeProviderDefinitionId = input.computeProviderDefinitionId;
    this.environmentProvider = input.environmentProvider;
    this.environmentTemplate = input.environmentTemplate;
    this.logger = input.logger;
    this.modelApiKey = input.modelApiKey;
    this.modelId = input.modelId;
    this.modelProviderId = input.modelProviderId;
    this.promptScope = input.promptScope;
    this.reasoningLevel = input.reasoningLevel;
    this.sessionId = input.sessionId;
    this.transactionProvider = input.transactionProvider;
  }

  /**
   * Rebuilds the prompt-template input on demand so callers do not need to remember how CompanyHelm
   * maps session facts into the shared system prompt template contract.
   */
  toSystemPromptTemplateContext(): SystemPromptTemplateContext {
    return new SystemPromptTemplateContext(
      this.agentId,
      this.agentName,
      this.companyName,
      this.sessionId,
    );
  }

  /**
   * Exposes desktop-interaction capability in one place so modules can gate computer-use behavior
   * on the selected environment template without duplicating provider-specific checks.
   */
  isComputerUseEnabled(): boolean {
    return this.environmentTemplate.computerUse;
  }
}
