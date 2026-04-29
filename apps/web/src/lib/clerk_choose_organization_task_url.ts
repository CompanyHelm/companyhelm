/**
 * Builds the Clerk-hosted choose-organization task URL used after the current organization can no
 * longer be trusted as a valid app context. Clerk renders this task inside the sign-in component
 * and keeps the task route in the hash fragment.
 */
export class ClerkChooseOrganizationTaskUrl {
  static build(origin: string): string {
    const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
    const redirectUrl = `${normalizedOrigin}/`;
    return `${normalizedOrigin}/sign-in#/tasks/choose-organization?sign_in_force_redirect_url=${
      encodeURIComponent(redirectUrl)
    }`;
  }

  static redirectCurrentWindow(): void {
    window.location.assign(ClerkChooseOrganizationTaskUrl.build(window.location.origin));
  }
}
