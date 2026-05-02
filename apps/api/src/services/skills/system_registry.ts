import type { SkillRecord } from "./service.ts";
import { SystemCommandCatalog } from "./system_command_catalog.ts";

type SystemSkillDefinition = {
  description: string;
  instructions: string;
  key: string;
  name: string;
};

/**
 * Provides the product-owned skill catalog that is not persisted per company. These records use
 * opaque IDs so callers can list and activate them next to company-created skills without treating
 * them as rows in the `skills` table.
 */
export class SystemSkillRegistry {
  private static readonly idPrefix = "system:";
  static readonly systemSkillGroupId = "system";
  private static readonly systemSkillGroupName = "System";

  private readonly commandCatalog: SystemCommandCatalog;
  private readonly definitions: SystemSkillDefinition[] = [
    {
      description: "Use when users ask how to use CompanyHelm or what agents can do in the product.",
      instructions: [
        "Use this skill to answer CompanyHelm how-to questions for normal company users. Do not describe platform-admin pages or platform operations unless the user explicitly says they are a platform admin.",
        "",
        "CompanyHelm is a workspace where company users create agents, chat with them, give them tools and credentials, and track the work they produce. Agents should answer from the point of view of an authenticated company member or owner, not an internal platform operator.",
        "",
        "## What CompanyHelm agents can do",
        "",
        "Agents can use the tools and integrations attached to their session. Depending on available tools, they can answer questions, inspect repositories, run terminal commands, browse with Playwright or the desktop, work in git branches, create pull requests, query connected MCP servers, manage durable CompanyHelm objects through system skills, and ask humans for approval or missing information.",
        "",
        "Agents must not claim access they have not proven with tool output. If a task needs a repository, credential, MCP server, secret, environment, or permission that is not available, explain what is missing and direct the user to the relevant CompanyHelm UI area.",
        "",
        "Useful system-skill capabilities include managing company skills, workflows, tasks, artifacts, agents, GitHub installations, and reading the company directory. These are session-scoped: activate the relevant system skill before using its commands.",
        "",
        "## What company users can do in the UI",
        "",
        "- Chat with agents from Chats, pick an agent/model for a session, review live transcript updates, and answer human handoff questions in Inbox.",
        "- Create and configure agents from Agents. Agent configuration includes name/title, model credential and model, reasoning level when supported, default compute/template, custom instructions, default skills, skill groups, MCP servers, secrets, and secret groups.",
        "- Add model credentials from LLM Credentials. Users can add provider keys, pick defaults for new agents, refresh models, inspect available models, set a default model, review usage, and delete or replace credentials when no longer needed.",
        "- Use the built-in CompanyHelm managed credential when available. It is managed by CompanyHelm; users normally do not paste an API key for it, but they may choose it as the default credential/model where the UI allows.",
        "- Manage Skills and Skill Groups. Skills teach agents reusable instructions. Git-backed skills can include supporting files; manual skills store instructions directly in CompanyHelm. Skill groups let users attach multiple skills to agents together.",
        "- Manage MCP Servers. MCP servers expose external tools and data sources to agents; OAuth callback flows appear under the MCP server pages when required.",
        "- Manage Secrets and Secret Groups. Secrets are environment variables or credentials exposed to selected agents/sessions. Users should store sensitive values here instead of pasting them into chat.",
        "- Manage Repositories and GitHub connections. Users can connect GitHub, select repositories available to agents, and then ask agents to inspect code, make branches, push changes, and open PRs when the GitHub installation permits it.",
        "- Manage Environments. Users can start/stop/delete environments, open browser/desktop access when supported, open terminals, and inspect metrics on environment detail pages.",
        "- Manage Tasks, task stages, and Artifacts. Tasks track work, stages define lanes, and artifacts store durable outputs such as PR links, docs, and other deliverables.",
        "- Manage Workflows. Workflows are reusable multi-step processes that can be started and tracked through workflow runs.",
        "- Review Usage and Billing. Usage shows AI token/spend trends. Settings > Billing shows plan, credits, and pay-as-you-go balance. Settings > Members manages company members. Settings > Company covers company details, and Settings > Agents / AI covers company-wide base instructions inherited by agent sessions.",
        "",
        "## How to set up LLM credentials",
        "",
        "1. Open the company's LLM Credentials page.",
        "2. Click Create credentials.",
        "3. Pick the provider: CompanyHelm managed, OpenAI, Anthropic, Google Gemini API, OpenRouter, OpenAI-compatible API, or OpenAI Codex OAuth when available.",
        "4. For API-key providers, paste the provider API key. For OpenAI-compatible APIs, also provide the compatible `/v1` base URL when the UI asks for it. For OpenAI Codex OAuth, run the command shown in the dialog, then paste the generated auth file JSON into the Auth File field.",
        "5. Optionally name the credential and mark it as the default for new agents.",
        "6. Save, then open the credential detail page to refresh models if needed and choose the default model for that credential.",
        "7. In Agents, create or edit an agent and select the desired credential/model. Existing sessions may keep their original model selection; start a new chat if the user needs a fresh default to apply.",
        "",
        "If credential setup fails, ask the user to verify the provider key, account access, base URL, and model availability. Do not ask the user to paste secrets into chat; tell them to use the credential or secret UI.",
        "",
        "## Answering how-to questions",
        "",
        "Give short, UI-oriented steps first. Mention exact page names when known: Chats, Agents, LLM Credentials, Skills, Skill Groups, MCP Servers, Secrets, Secret Groups, Repositories, Environments, Tasks, Workflows, Usage, Inbox, and Settings. If the user asks for something that sounds like a platform-admin action, say ordinary company users may not have that page and offer the closest company-user path.",
      ].join("\n"),
      key: "companyhelm_guide",
      name: "CompanyHelm guide",
    },
    {
      description: "Inspect and manage company skills, skill groups, and Git-backed skill imports through scoped system commands.",
      instructions: [
        "Use skill management commands when the user asks to inspect or change the company skill catalog or skill groups.",
        "Call skill.list to discover skills, skill.group.list to discover skill groups, then use skill.get for the full record before updating or deleting a specific skill.",
        "Use skill.create for manual skills and skill.github.import for repository-backed skills.",
        "Do not try to attach skills to agents with this skill; use the agent management system skill for agent defaults.",
      ].join("\n"),
      key: "manage_skills",
      name: "Manage skills",
    },
    {
      description: "Inspect and maintain durable workflow definitions through scoped system commands.",
      instructions: [
        "Use workflow management commands only when the user asks to inspect or change durable workflow definitions.",
        "Call workflow.list before updating workflows, inputs, or steps so you can target the correct IDs, including disabled workflows.",
        "Prefer small edits that preserve existing inputs and steps unless the user asks for a broader rewrite.",
        "Keep workflow step instructions concrete enough for a later agent session to execute without extra context.",
        "Do not start workflow runs with this skill; use the Execute workflows system skill for workflow execution.",
      ].join("\n"),
      key: "manage_workflows",
      name: "Manage workflows",
    },
    {
      description: "Discover enabled workflows, start workflow runs, and track workflow run step progress.",
      instructions: [
        "Before processing a user request, check workflow.execution.list for enabled workflows that may fit the request.",
        "Start a workflow only when there is a good match for the request; otherwise handle the request normally without a workflow.",
        "Prefer executionMode local when the current agent should execute the workflow in this same session.",
        "Use executionMode agent only when the workflow should be delegated to another agent session, and provide agentId.",
        "After starting a local workflow, follow the returned ordered steps. Mark each step running before working on it and done after completing it.",
      ].join("\n"),
      key: "execute_workflows",
      name: "Execute workflows",
    },
    {
      description: "Inspect, create, and update company agents through scoped system commands.",
      instructions: [
        "Use agent management commands only when the user asks to inspect or change persisted company agent configuration.",
        "Call agent.list before creating or updating agents when you need model, credential, compute provider, template, or secret IDs.",
        "Call agent.skills.list before changing an agent's skill defaults so you can see the current direct skill and skill-group assignments.",
        "Call agent.mcps.list before changing MCP defaults or when you need to inspect the MCP servers attached to one agent.",
        "Only send fields that should change when updating an agent.",
      ].join("\n"),
      key: "manage_agents",
      name: "Manage agents",
    },
    {
      description: "Inspect, create, update, and delete company tasks through scoped system commands.",
      instructions: [
        "Use task commands when the user asks to inspect or change the company task tracker.",
        "Call task.list before updating or deleting tasks so you can target the correct IDs.",
        "Use task.update for partial edits to task metadata, status, stage, or assignee instead of looking for field-specific commands.",
        "Create tasks only when the user confirms the work should be tracked or the session uncovers clear follow-up work.",
      ].join("\n"),
      key: "manage_tasks",
      name: "Manage tasks",
    },
    {
      description: "Create, inspect, update, and archive durable artifacts through scoped system commands.",
      instructions: [
        "Use artifact commands when the user asks to manage durable docs, links, pull requests, or other saved deliverables.",
        "List or get existing artifacts before creating duplicates or replacing content.",
        "Choose the narrowest update command for the artifact field that needs to change.",
      ].join("\n"),
      key: "manage_artifacts",
      name: "Manage artifacts",
    },
    {
      description: "List GitHub App installations and start user-driven installation flows through scoped system commands.",
      instructions: [
        "Use GitHub installation commands when the user needs to connect or inspect GitHub App installations for this company.",
        "Call github.installation.list before starting a new install when you need to know what is already connected.",
        "Use github.installation.start to create the install URL; give that URL to the user and let the callback report completion back into this session.",
        "Do not choose a return page for chat-started installs. The command returns users to this source chat after GitHub redirects back.",
      ].join("\n"),
      key: "manage_github_installations",
      name: "Manage GitHub installations",
    },
    {
      description: "Read company members and agents from the directory through scoped system commands.",
      instructions: [
        "Use company directory commands when you need stable company member or agent IDs for follow-up work.",
        "The directory is read-only; use the agent management system skill for persisted agent changes.",
      ].join("\n"),
      key: "company_directory",
      name: "Company directory",
    },
  ];

  constructor(commandCatalog: SystemCommandCatalog = new SystemCommandCatalog()) {
    this.commandCatalog = commandCatalog;
  }

  isSystemSkillId(skillId: string): boolean {
    return skillId.startsWith(SystemSkillRegistry.idPrefix);
  }

  getSystemSkillId(systemSkillKey: string): string {
    return `${SystemSkillRegistry.idPrefix}${systemSkillKey}`;
  }

  getSystemSkillGroup(companyId: string) {
    return {
      companyId,
      id: SystemSkillRegistry.systemSkillGroupId,
      name: SystemSkillRegistry.systemSkillGroupName,
    };
  }

  isSystemSkillGroupId(skillGroupId: string): boolean {
    return skillGroupId === SystemSkillRegistry.systemSkillGroupId;
  }

  parseSystemSkillId(skillId: string): string {
    if (!this.isSystemSkillId(skillId)) {
      throw new Error(`${skillId} is not a system skill ID.`);
    }

    return skillId.slice(SystemSkillRegistry.idPrefix.length);
  }

  listSkills(companyId: string): SkillRecord[] {
    return this.definitions.map((definition) => this.toSkillRecord(companyId, definition));
  }

  requireSkillById(companyId: string, skillId: string): SkillRecord {
    return this.requireSkillByKey(companyId, this.parseSystemSkillId(skillId));
  }

  requireSkillByKey(companyId: string, systemSkillKey: string): SkillRecord {
    const definition = this.definitions.find((candidate) => candidate.key === systemSkillKey);
    if (!definition) {
      throw new Error(`System skill ${systemSkillKey} not found.`);
    }

    return this.toSkillRecord(companyId, definition);
  }

  findSkillByName(companyId: string, skillName: string): SkillRecord | null {
    const definition = this.definitions.find((candidate) => candidate.name === skillName);
    return definition ? this.toSkillRecord(companyId, definition) : null;
  }

  listSkillsByKeys(companyId: string, systemSkillKeys: string[]): SkillRecord[] {
    const uniqueKeys = new Set(systemSkillKeys);
    return this.definitions
      .filter((definition) => uniqueKeys.has(definition.key))
      .map((definition) => this.toSkillRecord(companyId, definition))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private toSkillRecord(companyId: string, definition: SystemSkillDefinition): SkillRecord {
    return {
      companyId,
      description: definition.description,
      fileList: [],
      branchName: null,
      githubRepositoryId: null,
      githubRepositoryInstallationId: null,
      trackedCommitSha: null,
      id: this.getSystemSkillId(definition.key),
      instructions: definition.instructions,
      name: definition.name,
      repository: null,
      skillDirectory: null,
      skillGroupId: SystemSkillRegistry.systemSkillGroupId,
      sourceType: "manual",
      skillType: "system",
      systemCommands: this.commandCatalog.listCommandDefinitions(definition.key),
      systemKey: definition.key,
    };
  }
}
