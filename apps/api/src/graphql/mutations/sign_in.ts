import { decorate, inject, injectable } from "inversify";
import type { AuthSession } from "../../auth/auth_provider.ts";
import { AuthProvider } from "../../auth/auth_provider.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { Mutation } from "./mutation.ts";

type SignInMutationArguments = {
  input: {
    email: string;
    password: string;
  };
};

/**
 * Maps the GraphQL SignIn mutation onto the configured auth provider.
 */
@injectable("Singleton")
export class SignInMutation extends Mutation<SignInMutationArguments, AuthSession> {
  private readonly authProvider: AuthProvider;
  private readonly database: Pick<AppRuntimeDatabase, "getDatabase">;

  constructor(
    authProvider: AuthProvider,
    database: Pick<AppRuntimeDatabase, "getDatabase">,
  ) {
    super();
    this.authProvider = authProvider;
    this.database = database;
  }

  protected resolve = async (arguments_: SignInMutationArguments) => {
    return this.authProvider.signIn(this.database.getDatabase(), {
      email: arguments_.input.email,
      password: arguments_.input.password,
    });
  };
}

decorate(inject(AuthProvider), SignInMutation, 0);
decorate(inject(AppRuntimeDatabase), SignInMutation, 1);
