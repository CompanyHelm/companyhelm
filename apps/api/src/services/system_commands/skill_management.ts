import { SkillGithubCatalog } from "../skills/github/catalog.ts";
import { SkillService } from "../skills/service.ts";
import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { SystemCommandInputReader } from "./input_reader.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

type GithubSkillImportSelection = {
  branchName: string;
  repository: string;
  skillDirectory: string;
};

/**
 * Routes skill-management system commands through the same services used by GraphQL. Keeping this
 * command layer thin preserves catalog validation and Git import behavior in one service boundary.
 */
export class SkillManagementSystemCommandService {
  private static readonly defaultSkillListLimit = 50;

  private readonly githubCatalog: SkillGithubCatalog;
  private readonly inputReader = new SystemCommandInputReader();
  private readonly jsonSerializer = new SystemCommandJsonSerializer();
  private readonly skillService: SkillService;

  constructor(
    skillService: SkillService = new SkillService(),
    githubCatalog: SkillGithubCatalog = new SkillGithubCatalog(),
  ) {
    this.skillService = skillService;
    this.githubCatalog = githubCatalog;
  }

  async execute(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    switch (commandId) {
      case "skill.list":
        return this.listSkills(input, context);
      case "skill.get":
        return this.getSkill(input, context);
      case "skill.create":
        return this.createSkill(input, context);
      case "skill.github.import":
        return this.importGithubSkills(input, context);
      case "skill.update":
        return this.updateSkill(input, context);
      case "skill.delete":
        return this.deleteSkill(input, context);
      case "skill.group.create":
        return this.createSkillGroup(input, context);
      case "skill.group.update":
        return this.updateSkillGroup(input, context);
      case "skill.group.delete":
        return this.deleteSkillGroup(input, context);
      default:
        throw new Error(`System command ${commandId} is not handled by skill management.`);
    }
  }

  private async listSkills(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const limit = this.readSkillListLimit(payload);
    const startIndex = this.readSkillListCursor(payload);
    const skills = (await this.skillService.listSkills(context.transactionProvider, context.companyId))
      .sort((left, right) => left.name.localeCompare(right.name));
    const page = skills.slice(startIndex, startIndex + limit).map((skill) => ({
      description: skill.description,
      name: skill.name,
    }));
    const nextCursor = startIndex + limit < skills.length
      ? this.encodeSkillListCursor(startIndex + limit)
      : null;

    return this.jsonSerializer.serializeRecord({
      nextCursor,
      skills: page,
    });
  }

  private async getSkill(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skill = await this.skillService.getSkillByName(
      context.transactionProvider,
      context.companyId,
      this.inputReader.requireString(payload, "name"),
    );

    return this.jsonSerializer.serializeRecord({ skill });
  }

  private async createSkill(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skill = await this.skillService.createSkill(context.transactionProvider, {
      companyId: context.companyId,
      description: this.inputReader.requireString(payload, "description"),
      instructions: this.inputReader.requireString(payload, "instructions"),
      name: this.inputReader.requireString(payload, "name"),
      skillGroupId: this.inputReader.optionalNullableString(payload, "skillGroupId"),
    });

    return this.jsonSerializer.serializeRecord({ skill });
  }

  private async importGithubSkills(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skills = await this.githubCatalog.importSkills(context.transactionProvider, {
      companyId: context.companyId,
      skillGroupId: this.inputReader.optionalNullableString(payload, "skillGroupId"),
      skills: this.readGithubSkillSelections(payload),
    });

    return this.jsonSerializer.serializeRecord({ skills });
  }

  private async updateSkill(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skill = await this.skillService.updateSkill(context.transactionProvider, {
      companyId: context.companyId,
      description: this.inputReader.optionalNullableString(payload, "description"),
      instructions: this.inputReader.optionalNullableString(payload, "instructions"),
      name: this.inputReader.optionalNullableString(payload, "name"),
      skillGroupId: this.inputReader.optionalNullableString(payload, "skillGroupId"),
      skillId: this.inputReader.requireString(payload, "skillId"),
    });

    return this.jsonSerializer.serializeRecord({ skill });
  }

  private async deleteSkill(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skill = await this.skillService.deleteSkill(context.transactionProvider, {
      companyId: context.companyId,
      skillId: this.inputReader.requireString(payload, "skillId"),
    });

    return this.jsonSerializer.serializeRecord({ skill });
  }

  private async createSkillGroup(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skillGroup = await this.skillService.createSkillGroup(context.transactionProvider, {
      companyId: context.companyId,
      name: this.inputReader.requireString(payload, "name"),
    });

    return this.jsonSerializer.serializeRecord({ skillGroup });
  }

  private async updateSkillGroup(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skillGroup = await this.skillService.updateSkillGroup(context.transactionProvider, {
      companyId: context.companyId,
      name: this.inputReader.requireString(payload, "name"),
      skillGroupId: this.inputReader.requireString(payload, "skillGroupId"),
    });

    return this.jsonSerializer.serializeRecord({ skillGroup });
  }

  private async deleteSkillGroup(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skillGroup = await this.skillService.deleteSkillGroup(context.transactionProvider, {
      companyId: context.companyId,
      skillGroupId: this.inputReader.requireString(payload, "skillGroupId"),
    });

    return this.jsonSerializer.serializeRecord({ skillGroup });
  }

  private readGithubSkillSelections(payload: Record<string, unknown>): GithubSkillImportSelection[] {
    const value = payload.skills;
    if (!Array.isArray(value)) {
      throw new Error("skills must be an array.");
    }

    return value.map((entry) => {
      const record = this.inputReader.requireRecord(entry);
      return {
        branchName: this.inputReader.requireString(record, "branchName"),
        repository: this.inputReader.requireString(record, "repository"),
        skillDirectory: this.inputReader.requireString(record, "skillDirectory"),
      };
    });
  }

  private readSkillListLimit(payload: Record<string, unknown>): number {
    const limit = this.inputReader.optionalInteger(payload, "limit")
      ?? SkillManagementSystemCommandService.defaultSkillListLimit;
    if (limit < 1) {
      throw new Error("limit must be at least 1.");
    }

    return limit;
  }

  private readSkillListCursor(payload: Record<string, unknown>): number {
    const cursor = this.inputReader.optionalString(payload, "cursor");
    if (!cursor) {
      return 0;
    }

    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const offset = Number.parseInt(decoded, 10);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error("cursor must be a valid skill.list cursor.");
    }

    return offset;
  }

  private encodeSkillListCursor(offset: number): string {
    return Buffer.from(String(offset), "utf8").toString("base64url");
  }
}
