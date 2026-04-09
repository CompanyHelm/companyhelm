/**
 * Centralizes the org-scoped path convention so route declarations and navigation targets stay in
 * sync when the active company is encoded in the URL.
 */
export class OrganizationPath {
  static readonly PARAMETER_NAME = "organizationSlug";
  private static readonly ORGANIZATION_PREFIX = `/orgs/$${OrganizationPath.PARAMETER_NAME}`;

  static route(path: string): string {
    if (path === "/") {
      return OrganizationPath.ORGANIZATION_PREFIX;
    }

    return `${OrganizationPath.ORGANIZATION_PREFIX}${OrganizationPath.normalize(path)}`;
  }

  static href(organizationSlug: string, path: string): string {
    const normalizedSlug = organizationSlug.trim();
    if (normalizedSlug.length === 0) {
      throw new Error("Organization slug is required to build an organization URL.");
    }

    if (path === "/") {
      return `/orgs/${normalizedSlug}`;
    }

    return `/orgs/${normalizedSlug}${OrganizationPath.normalize(path)}`;
  }

  static stripPrefix(pathname: string): string {
    const matchedPath = pathname.match(/^\/orgs\/[^/]+(?<suffix>\/.*)?$/)?.groups?.suffix;
    if (!matchedPath) {
      return pathname;
    }

    return matchedPath.length > 0 ? matchedPath : "/";
  }

  private static normalize(path: string): string {
    if (path.startsWith("/")) {
      return path;
    }

    return `/${path}`;
  }
}
