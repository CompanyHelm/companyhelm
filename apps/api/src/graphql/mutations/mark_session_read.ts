import { inject, injectable } from "inversify";
import { RedisCompanyScopedService } from "../../services/redis/company_scoped_service.ts";
import { RedisService } from "../../services/redis/service.ts";
import {
  SessionReadService,
  type SessionGraphqlRecord,
} from "../../services/agent/session/read_service.ts";
import { SessionProcessPubSubNames } from "../../services/agent/session/process/pub_sub_names.ts";
import { UserSessionReadService } from "../../services/agent/session/user_session_read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type MarkSessionReadMutationArguments = {
  input: {
    sessionId: string;
  };
};

/**
 * Records that the authenticated user has seen the selected session so the chat list can clear the
 * unread indicator immediately without waiting for a full page reload.
 */
@injectable()
export class MarkSessionReadMutation extends Mutation<MarkSessionReadMutationArguments, SessionGraphqlRecord> {
  private readonly redisService: RedisService;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;
  private readonly sessionReadService: SessionReadService;
  private readonly userSessionReadService: UserSessionReadService;

  constructor(
    @inject(UserSessionReadService) userSessionReadService: UserSessionReadService = new UserSessionReadService(),
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
    @inject(RedisService) redisService: RedisService,
    @inject(SessionProcessPubSubNames) sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
  ) {
    super();
    this.redisService = redisService;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
    this.sessionReadService = sessionReadService;
    this.userSessionReadService = userSessionReadService;
  }

  protected resolve = async (
    arguments_: MarkSessionReadMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<SessionGraphqlRecord> => {
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.sessionId.length === 0) {
      throw new Error("sessionId is required.");
    }

    await this.userSessionReadService.markSessionRead(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      sessionId: arguments_.input.sessionId,
      userId: context.authSession.user.id,
    });
    await this.publishSessionUpdate(context.authSession.company.id, arguments_.input.sessionId);

    const sessionRecord = await this.sessionReadService.getSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      context.authSession.user.id,
    );
    if (!sessionRecord) {
      throw new Error("Session not found.");
    }

    return sessionRecord;
  };

  private async publishSessionUpdate(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionUpdateChannel(sessionId));
  }
}
