/**
 * Resolves the GraphQL health field.
 */
export class HealthQueryResolver {
  execute = async (): Promise<string> => {
    return "ok";
  };
}
