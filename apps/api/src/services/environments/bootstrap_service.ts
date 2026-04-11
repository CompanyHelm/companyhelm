import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { AgentEnvironmentWorkspaceBootstrapper } from "./workspace_bootstrapper.ts";
import { AgentEnvironmentSkillBootstrapper } from "./skills/bootstrapper.ts";
import type {
  AgentComputeProviderInterface,
  AgentEnvironmentRecord,
} from "./providers/provider_interface.ts";
import { AgentComputeProviderRegistry } from "./providers/provider_registry.ts";
import { AgentEnvironmentBootstrapperInterface } from "./bootstrapper_interface.ts";

/**
 * Coordinates the reusable filesystem bootstrap pipeline that runs after a provider creates an
 * environment. Keeping the shell creation and bootstrapper ordering here avoids duplicating setup
 * logic across provisioning and later environment-facing features.
 */
@injectable()
export class AgentEnvironmentBootstrapService {
  private readonly bootstrappers: AgentEnvironmentBootstrapperInterface[];
  private readonly providerRegistry: AgentComputeProviderRegistry;

  constructor(
    @inject(AgentComputeProviderRegistry)
    providerRegistryOrProvider: AgentComputeProviderRegistry | AgentComputeProviderInterface,
    @inject(AgentEnvironmentWorkspaceBootstrapper)
    workspaceBootstrapper: AgentEnvironmentWorkspaceBootstrapper = new AgentEnvironmentWorkspaceBootstrapper(),
    @inject(AgentEnvironmentSkillBootstrapper)
    skillBootstrapper: AgentEnvironmentSkillBootstrapper = new AgentEnvironmentSkillBootstrapper(),
  ) {
    this.providerRegistry = AgentEnvironmentBootstrapService.isProvider(providerRegistryOrProvider)
      ? {
          get() {
            return providerRegistryOrProvider;
          },
        } as never
      : providerRegistryOrProvider;
    this.bootstrappers = [
      workspaceBootstrapper,
      skillBootstrapper,
    ];
  }

  async bootstrap(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void> {
    const environmentShell = await this.providerRegistry
      .get(environment.provider)
      .createShell(transactionProvider, environment);

    for (const bootstrapper of this.bootstrappers) {
      await bootstrapper.bootstrap(environmentShell);
    }
  }

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
