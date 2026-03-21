/**
 * Resolves the GraphQL health field.
 */
export class HealthQueryResolver {
  async execute(): Promise<string> {
    return "ok";
  }
}
