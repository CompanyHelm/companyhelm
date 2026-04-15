import { inject, injectable } from "inversify";
import { AgentEnvironmentAccessService } from "../../services/environments/access_service.ts";
import { SessionReadService } from "../../services/agent/session/read_service.ts";
import { SessionSkillService } from "../../services/skills/session_service.ts";
import { SkillService } from "../../services/skills/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import { Mutation } from "./mutation.ts";

type DetachSkillFromSessionMutationArguments = {
  input: {
    sessionId: string;
    skillId: string;
  };
};

/**
 * Removes one active skill from a session and cleans up its file-backed materialization from the
 * leased environment when that skill has been copied into `/home/user/skills`.
 */
@injectable()
export class DetachSkillFromSessionMutation extends Mutation<
  DetachSkillFromSessionMutationArguments,
  GraphqlSkillRecord
> {
  private readonly environmentAccessService: AgentEnvironmentAccessService;
  private readonly sessionReadService: SessionReadService;
  private readonly sessionSkillService: SessionSkillService;
  private readonly skillService: SkillService;

  constructor(
    @inject(AgentEnvironmentAccessService) environmentAccessService: AgentEnvironmentAccessService = {
      async removeSkillFromOpenEnvironmentForSession() {
        return false;
      },
    } as never,
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
    @inject(SessionSkillService) sessionSkillService: SessionSkillService = new SessionSkillService(),
    @inject(SkillService) skillService: SkillService = new SkillService(),
  ) {
    super();
    this.environmentAccessService = environmentAccessService;
    this.sessionReadService = sessionReadService;
    this.sessionSkillService = sessionSkillService;
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: DetachSkillFromSessionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.authSession.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const session = await this.sessionReadService.getSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      context.authSession.user.id,
    );
    if (!session) {
      throw new Error("Session not found.");
    }

    const skill = await this.skillService.getSkill(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.skillId,
    );
    await this.sessionSkillService.deactivateSkill(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      sessionId: arguments_.input.sessionId,
      skillId: arguments_.input.skillId,
    });

    try {
      await this.environmentAccessService.removeSkillFromOpenEnvironmentForSession(
        context.app_runtime_transaction_provider,
        session.agentId,
        arguments_.input.sessionId,
        skill,
      );
    } catch (error) {
      await this.sessionSkillService.activateSkill(context.app_runtime_transaction_provider, {
        companyId: context.authSession.company.id,
        sessionId: arguments_.input.sessionId,
        skillName: skill.name,
      });
      throw new Error(
        `Failed to remove active skill ${skill.name} from the leased environment. The session change was rolled back.`,
        {
          cause: error,
        },
      );
    }

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
