import type { AgentSession } from "@mariozechner/pi-coding-agent";
import { AgentToolsService } from "./tools/service.ts";
import { AgentSessionBootstrapContext } from "./bootstrap_context.ts";
import { PiMonoSessionEventHandler } from "./session_event_handler.ts";

type AgentSessionRuntimeContextInput = {
  bootstrapContext: AgentSessionBootstrapContext;
  eventHandler: PiMonoSessionEventHandler;
  session: AgentSession;
  toolsService: AgentToolsService;
};

/**
 * Holds the live process-local objects for an initialized PI Mono session. The stable session facts
 * remain on the bootstrap context, while this runtime wrapper owns only the active SDK objects and
 * cleanup handles created after session assembly succeeds.
 */
export class AgentSessionRuntimeContext {
  readonly bootstrapContext: AgentSessionBootstrapContext;
  readonly eventHandler: PiMonoSessionEventHandler;
  readonly session: AgentSession;
  readonly toolsService: AgentToolsService;

  constructor(input: AgentSessionRuntimeContextInput) {
    this.bootstrapContext = input.bootstrapContext;
    this.eventHandler = input.eventHandler;
    this.session = input.session;
    this.toolsService = input.toolsService;
  }

  /**
   * Keeps the common company lookup explicit for callers that persist runtime state after a prompt
   * turn without forcing them to know where the identifier lives inside the bootstrap context.
   */
  getCompanyId(): string {
    return this.bootstrapContext.companyId;
  }
}
