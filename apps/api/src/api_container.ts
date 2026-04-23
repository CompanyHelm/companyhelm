import { Container } from "inversify";
import { AuthProvider } from "./auth/auth_provider.ts";
import { ClerkAuthProvider } from "./auth/clerk/clerk_auth_provider.ts";
import { LocalAuthProvider } from "./auth/local/local_auth_provider.ts";
import { OrganizationSlugResolver } from "./auth/organization_slug_resolver.ts";
import { OrganizationSlugResolverFactory } from "./auth/organization_slug_resolver_factory.ts";
import { Config } from "./config/schema.ts";

/**
 * Builds the application DI container so server startup resolves the API object graph from
 * constructor metadata instead of manual wiring.
 */
export class ApiContainer {
  static resolveAuthProviderClass(
    config: Config,
  ): typeof ClerkAuthProvider | typeof LocalAuthProvider {
    return config.auth.provider === "local"
      ? LocalAuthProvider
      : ClerkAuthProvider;
  }

  build(config: Config): Container {
    const container = new Container({
      autobind: true,
      defaultScope: "Singleton",
    });

    container.bind(Config).toConstantValue(config);
    container.bind(AuthProvider).to(ApiContainer.resolveAuthProviderClass(config) as never);
    container.bind(OrganizationSlugResolver).to(OrganizationSlugResolverFactory.resolveClass(config) as never);

    return container;
  }
}
