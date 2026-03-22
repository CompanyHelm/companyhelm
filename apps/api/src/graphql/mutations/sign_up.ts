import { AuthProviderFactory } from "../../auth/providers/auth_provider_factory.ts";
import type { AuthSession } from "../../auth/providers/auth_provider_interface.ts";
import type { AuthProviderDatabase } from "../../auth/providers/auth_provider_interface.ts";
import type { ConfigDocument } from "../../config/schema.ts";
import { Mutation } from "./mutation.ts";

type SignUpMutationArguments = {
  input: {
    email: string;
    firstName: string;
    lastName?: string | null;
    password: string;
  };
};

/**
 * Maps the GraphQL SignUp mutation onto the configured auth provider.
 */
export class SignUpMutation extends Mutation<SignUpMutationArguments, AuthSession> {
  private readonly authProvider;
  private readonly database: AuthProviderDatabase;

  constructor(
    config: ConfigDocument,
    database: AuthProviderDatabase,
  ) {
    super();
    this.authProvider = AuthProviderFactory.createAuthProvider(config);
    this.database = database;
  }

  protected resolve = async (arguments_: SignUpMutationArguments) => {
    if (!this.authProvider.signUp) {
      throw new Error("Configured auth provider does not support sign up.");
    }

    return this.authProvider.signUp(this.database, {
      email: arguments_.input.email,
      firstName: arguments_.input.firstName,
      lastName: arguments_.input.lastName ?? null,
      password: arguments_.input.password,
    });
  };
}
