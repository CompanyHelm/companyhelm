import { injectable } from "inversify";
import { Resolver } from "./resolver.ts";

/**
 * Resolves the GraphQL health field.
 */
@injectable()
export class HealthQueryResolver extends Resolver<string> {
  protected resolve = async (): Promise<string> => {
    return "ok";
  };
}
