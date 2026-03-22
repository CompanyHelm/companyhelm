import { bindingScopeValues, decorate, inject, injectable } from "inversify";
import { AuthProviderServiceIdentifier } from "../../auth/providers/auth_provider_service_identifier.ts";
import type {
  AuthProviderInterface,
  AuthSession,
} from "../../auth/providers/auth_provider_interface.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
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
@injectable(bindingScopeValues.Singleton)
export class SignUpMutation extends Mutation<SignUpMutationArguments, AuthSession> {
  private readonly authProvider: AuthProviderInterface;
  private readonly database: Pick<AppRuntimeDatabase, "getDatabase">;

  constructor(
    authProvider: AuthProviderInterface,
    database: Pick<AppRuntimeDatabase, "getDatabase">,
  ) {
    super();
    this.authProvider = authProvider;
    this.database = database;
  }

  protected resolve = async (arguments_: SignUpMutationArguments) => {
    if (!this.authProvider.signUp) {
      throw new Error("Configured auth provider does not support sign up.");
    }

    return this.authProvider.signUp(this.database.getDatabase(), {
      email: arguments_.input.email,
      firstName: arguments_.input.firstName,
      lastName: arguments_.input.lastName ?? null,
      password: arguments_.input.password,
    });
  };
}

decorate(inject(AuthProviderServiceIdentifier), SignUpMutation, 0);
decorate(inject(AppRuntimeDatabase), SignUpMutation, 1);
