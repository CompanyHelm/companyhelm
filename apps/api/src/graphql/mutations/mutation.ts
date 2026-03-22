/**
 * Defines the shared GraphQL mutation adapter so concrete mutations only implement argument handling.
 */
export abstract class Mutation<TArguments, TResult> {
  execute = async (_root: unknown, arguments_: TArguments): Promise<TResult> => {
    return this.resolve(arguments_);
  };

  protected abstract resolve(arguments_: TArguments): Promise<TResult> | TResult;
}
