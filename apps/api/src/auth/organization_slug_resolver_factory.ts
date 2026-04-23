import { Config } from "../config/schema.ts";
import { ClerkOrganizationSlugResolver } from "./clerk/organization_slug_resolver.ts";
import { LocalOrganizationSlugResolver } from "./local/local_organization_slug_resolver.ts";
import { OrganizationSlugResolver } from "./organization_slug_resolver.ts";

/**
 * Centralizes resolver selection so auth-provider-dependent URL generation can stay consistent
 * across DI-managed and manually-constructed call sites.
 */
export class OrganizationSlugResolverFactory {
  static create(config: Config): OrganizationSlugResolver {
    return config.auth?.provider === "clerk"
      ? new ClerkOrganizationSlugResolver(config)
      : new LocalOrganizationSlugResolver();
  }

  static resolveClass(config: Config): typeof ClerkOrganizationSlugResolver | typeof LocalOrganizationSlugResolver {
    return config.auth.provider === "clerk"
      ? ClerkOrganizationSlugResolver
      : LocalOrganizationSlugResolver;
  }
}
