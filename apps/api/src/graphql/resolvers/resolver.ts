/**
 * Defines the shared GraphQL query resolver adapter so concrete resolvers only implement their field logic.
 */
export abstract class Resolver<TResult> {
  execute = async (): Promise<TResult> => {
    return this.resolve();
  };

  protected abstract resolve(): Promise<TResult> | TResult;
}
