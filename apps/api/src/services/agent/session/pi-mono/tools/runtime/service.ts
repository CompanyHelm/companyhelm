/**
 * Provides runtime-level helpers that do not depend on any one provider integration. These tools
 * let sessions pace themselves without coupling simple control flow to the environment layer.
 */
export class AgentRuntimeToolService {
  async wait(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
