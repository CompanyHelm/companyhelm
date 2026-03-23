import type { GraphqlRequestContext } from "../graphql_request_context.ts";

/**
 * Defines the shared GraphQL mutation adapter so concrete mutations only implement argument handling.
 */
export abstract class Mutation<TArguments, TResult> {
  execute = async (
    _root: unknown,
    arguments_: TArguments,
    context: GraphqlRequestContext,
  ): Promise<TResult> => {
    return this.resolve(arguments_, context);
  };

  protected abstract resolve(
    arguments_: TArguments,
    context: GraphqlRequestContext,
  ): Promise<TResult> | TResult;
}
