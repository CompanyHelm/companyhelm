type MutationHandler<TArguments, TResult> = (arguments_: TArguments) => Promise<TResult> | TResult;

/**
 * Adapts a mutation that only cares about GraphQL arguments to the GraphQL field resolver shape.
 */
export class Mutation<TArguments, TResult> {
  private readonly handler: MutationHandler<TArguments, TResult>;

  constructor(handler: MutationHandler<TArguments, TResult>) {
    this.handler = handler;
  }

  execute = async (_root: unknown, arguments_: TArguments): Promise<TResult> => {
    return this.handler(arguments_);
  };
}
