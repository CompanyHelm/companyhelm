import type { GraphqlRequestContext } from "../graphql_request_context.ts";

/**
 * Defines the shared GraphQL query resolver adapter so concrete resolvers only implement their field logic.
 */
export abstract class Resolver<TResult> {
  execute = async (
    _root: unknown,
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): Promise<TResult> => {
    return this.resolve(context);
  };

  protected abstract resolve(context: GraphqlRequestContext): Promise<TResult> | TResult;
}
