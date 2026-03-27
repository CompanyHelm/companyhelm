import { Container } from "inversify";
import { AuthProvider } from "./auth/auth_provider.ts";
import { ClerkAuthProvider } from "./auth/clerk/clerk_auth_provider.ts";
import { Config } from "./config/schema.ts";
import { AgentComputeDaytonaProvider } from "./services/agent/compute/daytona/daytona_provider.ts";
import { AgentComputeProviderInterface } from "./services/agent/compute/provider_interface.ts";

/**
 * Builds the application DI container so server startup resolves the API object graph from
 * constructor metadata instead of manual wiring.
 */
export class ApiContainer {
  build(config: Config): Container {
    const container = new Container({
      autobind: true,
      defaultScope: "Singleton",
    });

    container.bind(Config).toConstantValue(config);
    container.bind(AuthProvider).to(ClerkAuthProvider);
    container.bind(AgentComputeProviderInterface).to(AgentComputeDaytonaProvider);

    return container;
  }
}
