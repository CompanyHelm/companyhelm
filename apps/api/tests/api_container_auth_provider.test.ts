import { describe, expect, it } from "vitest";
import { ApiContainer } from "../src/api_container.ts";
import { DevAuthProvider } from "../src/auth/dev/dev_auth_provider.ts";
import { LocalAuthProvider } from "../src/auth/local/local_auth_provider.ts";

describe("ApiContainer auth provider selection", () => {
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
