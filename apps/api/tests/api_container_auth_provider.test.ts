import { describe, expect, it } from "vitest";
import { ApiContainer } from "../src/api_container.ts";
import { ClerkAuthProvider } from "../src/auth/clerk/clerk_auth_provider.ts";
import { DevAuthProvider } from "../src/auth/dev/dev_auth_provider.ts";
import { LocalAuthProvider } from "../src/auth/local/local_auth_provider.ts";

describe("ApiContainer auth provider selection", () => {
  it("uses the Clerk auth provider by default", () => {
    expect(ApiContainer.resolveAuthProviderClass({
      auth: {
        clerk: {
          authorized_parties: ["http://localhost:5173"],
          jwks_url: "https://clerk.example/.well-known/jwks.json",
          publishable_key: "pk_test_local",
          secret_key: "sk_test_local",
        },
        provider: "clerk",
      },
    } as never)).toBe(ClerkAuthProvider);
  });

  it("uses the local auth provider when local auth is configured", () => {
    expect(ApiContainer.resolveAuthProviderClass({
      auth: {
        local: {
          password_pepper: "",
          session_duration_hours: 168,
          session_issuer: "companyhelm.local",
          session_secret: "local-session-secret",
        },
        provider: "local",
      },
    } as never)).toBe(LocalAuthProvider);
  });

  it("uses the dev auth provider when dev auth is configured", () => {
    expect(ApiContainer.resolveAuthProviderClass({
      auth: {
        dev: {},
        provider: "dev",
      },
    } as never)).toBe(DevAuthProvider);
  });
});
