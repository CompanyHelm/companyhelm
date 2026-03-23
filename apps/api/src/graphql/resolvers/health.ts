import { injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

/**
 * Resolves the GraphQL health field.
 */
@injectable("Singleton")
export class HealthQueryResolver extends Resolver<string> {
  protected resolve = async (_context: GraphqlRequestContext): Promise<string> => {
    void _context;
    return "ok";
  };
}
