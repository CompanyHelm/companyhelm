import { afterEach, describe, expect, it } from "vitest";
import { ApiContainer } from "../src/api_container.ts";
import { ClerkAuthProvider } from "../src/auth/clerk/clerk_auth_provider.ts";
import { LocalDevAuthProvider } from "../src/auth/local_dev/local_dev_auth_provider.ts";

afterEach(() => {
  delete process.env.COMPANYHELM_LOCAL_DEV_AUTH_BYPASS;
});

describe("ApiContainer auth provider selection", () => {
  it("uses the Clerk auth provider by default", () => {
    expect(ApiContainer.resolveAuthProviderClass()).toBe(ClerkAuthProvider);
  });

  it("uses the local dev auth provider when the bypass flag is enabled", () => {
    process.env.COMPANYHELM_LOCAL_DEV_AUTH_BYPASS = "true";

    expect(ApiContainer.resolveAuthProviderClass()).toBe(LocalDevAuthProvider);
  });
});
