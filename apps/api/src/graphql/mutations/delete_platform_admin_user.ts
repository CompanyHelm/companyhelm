import { inject, injectable } from "inversify";
import {
  PlatformAdminUserDeletionService,
  type PlatformAdminUserDeletionPayload,
} from "../../services/platform_admin_user_deletion_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeletePlatformAdminUserMutationArguments = {
  input: {
    confirmationEmail: string;
    userId: string;
  };
};

/**
 * Exposes platform-admin-only account deletion after an exact-email confirmation, keeping the
 * external Clerk deletion and local membership cleanup behind one auditable GraphQL mutation.
 */
@injectable()
export class DeletePlatformAdminUserMutation extends Mutation<
  DeletePlatformAdminUserMutationArguments,
  PlatformAdminUserDeletionPayload
> {
  private readonly userDeletionService: PlatformAdminUserDeletionService;

  constructor(
    @inject(PlatformAdminUserDeletionService)
    userDeletionService: PlatformAdminUserDeletionService = {} as never,
  ) {
    super();
    this.userDeletionService = userDeletionService;
  }

  protected resolve = async (
    arguments_: DeletePlatformAdminUserMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<PlatformAdminUserDeletionPayload> => {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }

    return this.userDeletionService.deleteUser({
      confirmationEmail: arguments_.input.confirmationEmail,
      requestingUserId: context.authSession.user.id,
      userId: arguments_.input.userId,
    });
  };
}
