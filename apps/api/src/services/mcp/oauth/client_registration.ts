import { injectable } from "inversify";
import type { McpOauthRegisteredClient } from "./types.ts";
import { normalizeNonEmptyString } from "./types.ts";

async function readJsonResponse(
  response: Response,
  errorPrefix: string,
): Promise<Record<string, unknown>> {
  const rawBody = await response.text();
  if (!response.ok) {
    const normalizedBody = normalizeNonEmptyString(rawBody);
    throw new Error(normalizedBody ? `${errorPrefix}: ${normalizedBody}` : errorPrefix);
  }

  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new Error(`${errorPrefix}: response body must be valid JSON.`);
  }
}

@injectable()
export class McpOauthClientRegistrationService {
  async registerClient(params: {
    clientName: string;
    fetchImpl?: typeof fetch;
    manualClient?: {
      clientId: string;
      clientSecret?: string | null;
      tokenEndpointAuthMethod?: string | null;
    } | null;
    redirectUri: string;
    registrationEndpoint?: string | null;
  }): Promise<McpOauthRegisteredClient> {
    const manualClientId = normalizeNonEmptyString(params.manualClient?.clientId);
    if (manualClientId) {
      return {
        clientId: manualClientId,
        clientSecret: normalizeNonEmptyString(params.manualClient?.clientSecret),
        clientRegistrationMetadata: null,
        tokenEndpointAuthMethod: normalizeNonEmptyString(
          params.manualClient?.tokenEndpointAuthMethod,
        ) ?? "client_secret_post",
      };
    }

    const registrationEndpoint = normalizeNonEmptyString(params.registrationEndpoint);
    const redirectUri = normalizeNonEmptyString(params.redirectUri);
    const clientName = normalizeNonEmptyString(params.clientName);
    if (!registrationEndpoint) {
      throw new Error("OAuth authorization server requires a manual client because dynamic registration is unavailable.");
    }
    if (!redirectUri) {
      throw new Error("OAuth redirect URI is required.");
    }
    if (!clientName) {
      throw new Error("OAuth client name is required.");
    }

    const fetchImpl = params.fetchImpl ?? fetch;
    const registrationMetadata = await readJsonResponse(
      await fetchImpl(registrationEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          client_name: clientName,
          grant_types: ["authorization_code", "refresh_token"],
          redirect_uris: [redirectUri],
          response_types: ["code"],
          token_endpoint_auth_method: "client_secret_post",
        }),
      }),
      "Failed to register OAuth client",
    );

    const clientId = normalizeNonEmptyString(registrationMetadata.client_id);
    if (!clientId) {
      throw new Error("OAuth client registration response is missing client_id.");
    }

    return {
      clientId,
      clientSecret: normalizeNonEmptyString(registrationMetadata.client_secret),
      clientRegistrationMetadata: registrationMetadata,
      tokenEndpointAuthMethod: normalizeNonEmptyString(
        registrationMetadata.token_endpoint_auth_method,
      ) ?? "client_secret_post",
    };
  }
}
