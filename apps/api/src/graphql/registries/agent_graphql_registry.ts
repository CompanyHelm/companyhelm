import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { SecretEncryptionService } from "../../services/secrets/encryption.ts";
import { SecretService } from "../../services/secrets/service.ts";
import { AgentEnvironmentTemplateService } from "../../services/environments/template_service.ts";
import { SkillService } from "../../services/skills/service.ts";
import { McpService } from "../../services/mcp/service.ts";
import { AddAgentMutation } from "../mutations/add_agent.ts";
import { AttachSecretToAgentMutation } from "../mutations/attach_secret_to_agent.ts";
import { AttachSecretGroupToAgentMutation } from "../mutations/attach_secret_group_to_agent.ts";
import { AttachMcpServerToAgentMutation } from "../mutations/attach_mcp_server_to_agent.ts";
import { AttachSkillGroupToAgentMutation } from "../mutations/attach_skill_group_to_agent.ts";
import { AttachSkillToAgentMutation } from "../mutations/attach_skill_to_agent.ts";
import { DeleteAgentMutation } from "../mutations/delete_agent.ts";
import { DetachSecretFromAgentMutation } from "../mutations/detach_secret_from_agent.ts";
import { DetachSecretGroupFromAgentMutation } from "../mutations/detach_secret_group_from_agent.ts";
import { DetachMcpServerFromAgentMutation } from "../mutations/detach_mcp_server_from_agent.ts";
import { DetachSkillGroupFromAgentMutation } from "../mutations/detach_skill_group_from_agent.ts";
import { DetachSkillFromAgentMutation } from "../mutations/detach_skill_from_agent.ts";
import { UpdateAgentMutation } from "../mutations/update_agent.ts";
import { AgentQueryResolver } from "../resolvers/agent.ts";
import { AgentCreateOptionsQueryResolver } from "../resolvers/agent_create_options.ts";
import { AgentEnvironmentTemplateResolver } from "../resolvers/agent_environment_template.ts";
import { AgentSecretsQueryResolver } from "../resolvers/agent_secrets.ts";
import { AgentSecretGroupsQueryResolver } from "../resolvers/agent_secret_groups.ts";
import { AgentMcpServersQueryResolver } from "../resolvers/agent_mcp_servers.ts";
import { AgentSkillGroupsQueryResolver } from "../resolvers/agent_skill_groups.ts";
import { AgentSkillsQueryResolver } from "../resolvers/agent_skills.ts";
import { AgentsQueryResolver } from "../resolvers/agents.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

/**
 * Owns the GraphQL schema surface that directly reads and mutates agents plus their attached
 * secrets, skill assignments, and agent-specific field resolvers.
 */
@injectable()
export class AgentGraphqlRegistry implements GraphqlRegistryInterface {
  private addAgentMutation: AddAgentMutation;
  private attachSecretToAgentMutation: AttachSecretToAgentMutation;
  private attachSecretGroupToAgentMutation: AttachSecretGroupToAgentMutation;
  private attachMcpServerToAgentMutation: AttachMcpServerToAgentMutation;
  private attachSkillGroupToAgentMutation: AttachSkillGroupToAgentMutation;
  private attachSkillToAgentMutation: AttachSkillToAgentMutation;
  private agentQueryResolver: AgentQueryResolver;
  private agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver;
  private agentEnvironmentTemplateResolver: AgentEnvironmentTemplateResolver;
  private agentSecretsQueryResolver: AgentSecretsQueryResolver;
  private agentSecretGroupsQueryResolver: AgentSecretGroupsQueryResolver;
  private agentMcpServersQueryResolver: AgentMcpServersQueryResolver;
  private agentSkillGroupsQueryResolver: AgentSkillGroupsQueryResolver;
  private agentSkillsQueryResolver: AgentSkillsQueryResolver;
  private agentsQueryResolver: AgentsQueryResolver;
  private deleteAgentMutation: DeleteAgentMutation;
  private detachSecretFromAgentMutation: DetachSecretFromAgentMutation;
  private detachSecretGroupFromAgentMutation: DetachSecretGroupFromAgentMutation;
  private detachMcpServerFromAgentMutation: DetachMcpServerFromAgentMutation;
  private detachSkillGroupFromAgentMutation: DetachSkillGroupFromAgentMutation;
  private detachSkillFromAgentMutation: DetachSkillFromAgentMutation;
  private updateAgentMutation: UpdateAgentMutation;

  constructor(
    @inject(Config) config: Config,
    @inject(AddAgentMutation) addAgentMutation?: AddAgentMutation,
    @inject(AgentQueryResolver) agentQueryResolver?: AgentQueryResolver,
    @inject(AgentCreateOptionsQueryResolver)
    agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver = new AgentCreateOptionsQueryResolver(),
    @inject(AgentsQueryResolver) agentsQueryResolver: AgentsQueryResolver = new AgentsQueryResolver(),
    @inject(DeleteAgentMutation) deleteAgentMutation: DeleteAgentMutation = new DeleteAgentMutation(),
    @inject(UpdateAgentMutation) updateAgentMutation: UpdateAgentMutation = new UpdateAgentMutation(),
    @inject(AttachSecretToAgentMutation)
    attachSecretToAgentMutation?: AttachSecretToAgentMutation,
    @inject(AttachSecretGroupToAgentMutation)
    attachSecretGroupToAgentMutation?: AttachSecretGroupToAgentMutation,
    @inject(AttachMcpServerToAgentMutation)
    attachMcpServerToAgentMutation?: AttachMcpServerToAgentMutation,
    @inject(AttachSkillGroupToAgentMutation)
    attachSkillGroupToAgentMutation?: AttachSkillGroupToAgentMutation,
    @inject(AttachSkillToAgentMutation)
    attachSkillToAgentMutation?: AttachSkillToAgentMutation,
    @inject(DetachSecretFromAgentMutation)
    detachSecretFromAgentMutation?: DetachSecretFromAgentMutation,
    @inject(DetachSecretGroupFromAgentMutation)
    detachSecretGroupFromAgentMutation?: DetachSecretGroupFromAgentMutation,
    @inject(DetachMcpServerFromAgentMutation)
    detachMcpServerFromAgentMutation?: DetachMcpServerFromAgentMutation,
    @inject(DetachSkillGroupFromAgentMutation)
    detachSkillGroupFromAgentMutation?: DetachSkillGroupFromAgentMutation,
    @inject(DetachSkillFromAgentMutation)
    detachSkillFromAgentMutation?: DetachSkillFromAgentMutation,
    @inject(AgentSecretsQueryResolver)
    agentSecretsQueryResolver?: AgentSecretsQueryResolver,
    @inject(AgentSecretGroupsQueryResolver)
    agentSecretGroupsQueryResolver?: AgentSecretGroupsQueryResolver,
    @inject(AgentMcpServersQueryResolver)
    agentMcpServersQueryResolver?: AgentMcpServersQueryResolver,
    @inject(AgentSkillGroupsQueryResolver)
    agentSkillGroupsQueryResolver?: AgentSkillGroupsQueryResolver,
    @inject(AgentSkillsQueryResolver)
    agentSkillsQueryResolver?: AgentSkillsQueryResolver,
    @inject(AgentEnvironmentTemplateService)
    agentEnvironmentTemplateService?: AgentEnvironmentTemplateService,
    @inject(AgentEnvironmentTemplateResolver)
    agentEnvironmentTemplateResolver?: AgentEnvironmentTemplateResolver,
  ) {
    const defaultSecretService = new SecretService(new SecretEncryptionService(config));
    const defaultSkillService = new SkillService();
    const defaultMcpService = new McpService();
    const defaultAgentEnvironmentTemplateService = agentEnvironmentTemplateService
      ?? AgentGraphqlRegistry.createFallbackAgentEnvironmentTemplateService();

    this.addAgentMutation = addAgentMutation
      ?? new AddAgentMutation(
        defaultSecretService,
        defaultSkillService,
        defaultAgentEnvironmentTemplateService,
        defaultMcpService,
      );
    this.attachSecretToAgentMutation = attachSecretToAgentMutation
      ?? new AttachSecretToAgentMutation(defaultSecretService);
    this.attachSecretGroupToAgentMutation = attachSecretGroupToAgentMutation
      ?? new AttachSecretGroupToAgentMutation(defaultSecretService);
    this.attachMcpServerToAgentMutation = attachMcpServerToAgentMutation
      ?? new AttachMcpServerToAgentMutation(defaultMcpService);
    this.attachSkillGroupToAgentMutation = attachSkillGroupToAgentMutation
      ?? new AttachSkillGroupToAgentMutation(defaultSkillService);
    this.attachSkillToAgentMutation = attachSkillToAgentMutation
      ?? new AttachSkillToAgentMutation(defaultSkillService);
    this.agentQueryResolver = agentQueryResolver ?? new AgentQueryResolver();
    this.agentCreateOptionsQueryResolver = agentCreateOptionsQueryResolver;
    this.agentEnvironmentTemplateResolver = agentEnvironmentTemplateResolver
      ?? new AgentEnvironmentTemplateResolver(defaultAgentEnvironmentTemplateService);
    this.agentSecretsQueryResolver = agentSecretsQueryResolver
      ?? new AgentSecretsQueryResolver(defaultSecretService);
    this.agentSecretGroupsQueryResolver = agentSecretGroupsQueryResolver
      ?? new AgentSecretGroupsQueryResolver(defaultSecretService);
    this.agentMcpServersQueryResolver = agentMcpServersQueryResolver
      ?? new AgentMcpServersQueryResolver(defaultMcpService);
    this.agentSkillGroupsQueryResolver = agentSkillGroupsQueryResolver
      ?? new AgentSkillGroupsQueryResolver(defaultSkillService);
    this.agentSkillsQueryResolver = agentSkillsQueryResolver
      ?? new AgentSkillsQueryResolver(defaultSkillService);
    this.agentsQueryResolver = agentsQueryResolver;
    this.deleteAgentMutation = deleteAgentMutation;
    this.detachSecretFromAgentMutation = detachSecretFromAgentMutation
      ?? new DetachSecretFromAgentMutation(defaultSecretService);
    this.detachSecretGroupFromAgentMutation = detachSecretGroupFromAgentMutation
      ?? new DetachSecretGroupFromAgentMutation(defaultSecretService);
    this.detachMcpServerFromAgentMutation = detachMcpServerFromAgentMutation
      ?? new DetachMcpServerFromAgentMutation(defaultMcpService);
    this.detachSkillGroupFromAgentMutation = detachSkillGroupFromAgentMutation
      ?? new DetachSkillGroupFromAgentMutation(defaultSkillService);
    this.detachSkillFromAgentMutation = detachSkillFromAgentMutation
      ?? new DetachSkillFromAgentMutation(defaultSkillService);
    this.updateAgentMutation = updateAgentMutation;
  }

  createResolvers(): GraphqlResolverFragment {
    return {
      Agent: {
        environmentTemplate: this.agentEnvironmentTemplateResolver.execute,
      },
      Mutation: {
        AddAgent: this.addAgentMutation.execute,
        AttachSecretToAgent: this.attachSecretToAgentMutation.execute,
        AttachSecretGroupToAgent: this.attachSecretGroupToAgentMutation.execute,
        AttachMcpServerToAgent: this.attachMcpServerToAgentMutation.execute,
        AttachSkillGroupToAgent: this.attachSkillGroupToAgentMutation.execute,
        AttachSkillToAgent: this.attachSkillToAgentMutation.execute,
        DeleteAgent: this.deleteAgentMutation.execute,
        DetachSecretFromAgent: this.detachSecretFromAgentMutation.execute,
        DetachSecretGroupFromAgent: this.detachSecretGroupFromAgentMutation.execute,
        DetachMcpServerFromAgent: this.detachMcpServerFromAgentMutation.execute,
        DetachSkillGroupFromAgent: this.detachSkillGroupFromAgentMutation.execute,
        DetachSkillFromAgent: this.detachSkillFromAgentMutation.execute,
        UpdateAgent: this.updateAgentMutation.execute,
      },
      Query: {
        Agent: this.agentQueryResolver.execute,
        AgentCreateOptions: this.agentCreateOptionsQueryResolver.execute,
        AgentSecrets: this.agentSecretsQueryResolver.execute,
        AgentSecretGroups: this.agentSecretGroupsQueryResolver.execute,
        AgentMcpServers: this.agentMcpServersQueryResolver.execute,
        AgentSkillGroups: this.agentSkillGroupsQueryResolver.execute,
        AgentSkills: this.agentSkillsQueryResolver.execute,
        Agents: this.agentsQueryResolver.execute,
      },
    };
  }

  getAgentEnvironmentTemplateResolver(): AgentEnvironmentTemplateResolver {
    return this.agentEnvironmentTemplateResolver;
  }

  setAgentEnvironmentTemplateResolver(agentEnvironmentTemplateResolver: AgentEnvironmentTemplateResolver): void {
    this.agentEnvironmentTemplateResolver = agentEnvironmentTemplateResolver;
  }

  private static createFallbackAgentEnvironmentTemplateService(): AgentEnvironmentTemplateService {
    return {
      async getAgentTemplate() {
        return {
          computerUse: true,
          cpuCount: 4,
          diskSpaceGb: 10,
          memoryGb: 8,
          name: "Desktop",
          templateId: "e2b/desktop",
        };
      },
      async listTemplatesForProvider() {
        return [{
          computerUse: true,
          cpuCount: 4,
          diskSpaceGb: 10,
          memoryGb: 8,
          name: "Desktop",
          templateId: "e2b/desktop",
        }];
      },
      async resolveTemplateForProvider(
        _transactionProvider: TransactionProviderInterface,
        input: {
          companyId: string;
          providerDefinitionId: string;
          templateId: string;
        },
      ) {
        if (input.templateId === "e2b/desktop") {
          return {
            computerUse: true,
            cpuCount: 4,
            diskSpaceGb: 10,
            memoryGb: 8,
            name: "Desktop",
            templateId: input.templateId,
          };
        }

        return {
          computerUse: false,
          cpuCount: 4,
          diskSpaceGb: 10,
          memoryGb: 8,
          name: "Default",
          templateId: input.templateId,
        };
      },
    } as never;
  }
}
