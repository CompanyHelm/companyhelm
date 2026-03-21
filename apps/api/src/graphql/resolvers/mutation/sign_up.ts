import { SignUpMutation } from "../../mutations/sign_up.ts";

type SignUpMutationResolverArguments = {
  input: {
    email: string;
    firstName: string;
    lastName?: string | null;
    password: string;
  };
};

/**
 * Resolves the GraphQL SignUp field by delegating to the mutation implementation.
 */
export class SignUpMutationResolver {
  private readonly signUpMutation: SignUpMutation;

  constructor(signUpMutation: SignUpMutation) {
    this.signUpMutation = signUpMutation;
  }

  async execute(_root: unknown, arguments_: SignUpMutationResolverArguments) {
    return this.signUpMutation.execute(arguments_);
  }
}
