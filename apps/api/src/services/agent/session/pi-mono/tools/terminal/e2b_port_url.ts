import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentToolParameterSchema } from "../parameter_schema.ts";

/**
 * Returns the raw E2B HTTPS URL for a service listening on a port in the current leased sandbox.
 * It deliberately avoids persistence or CompanyHelm proxying so agents can publish lightweight
 * preview links before the authenticated preview-domain flow exists.
 */
export class AgentE2bPortUrlTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    port: Type.Integer({
      description: "Sandbox port to expose through E2B, such as 5173 for a Vite web app or 3000 for an API server.",
      maximum: 65_535,
      minimum: 1,
    }),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  createDefinition(): ToolDefinition<typeof AgentE2bPortUrlTool.parameters> {
    return {
      description: "Return the raw public E2B HTTPS URL for a port in the current sandbox. This does not create CompanyHelm storage or auth.",
      execute: async (_toolCallId, params) => {
        const environment = await this.promptScope.getEnvironment();
        const environmentRecord = environment.getRecord();
        if (environmentRecord.provider !== "e2b") {
          throw new Error("get_e2b_port_url only supports E2B environments.");
        }

        const url = environment.getPublicHttpUrlForPort(params.port);

        return {
          content: [{
            text: [
              `environmentId: ${environmentRecord.id}`,
              `providerEnvironmentId: ${environmentRecord.providerEnvironmentId}`,
              `port: ${params.port}`,
              `url: ${url}`,
            ].join("\n"),
            type: "text",
          }],
          details: {
            environmentId: environmentRecord.id,
            port: params.port,
            providerEnvironmentId: environmentRecord.providerEnvironmentId,
            type: "e2b_port_url",
            url,
          },
        };
      },
      label: "get_e2b_port_url",
      name: "get_e2b_port_url",
      parameters: AgentE2bPortUrlTool.parameters,
      promptGuidelines: [
        "Use get_e2b_port_url after starting a web or API server inside the sandbox on 0.0.0.0.",
        "Call this once per service port when a preview has both frontend and backend ports.",
        "The returned URL is a raw E2B URL, not a CompanyHelm-authenticated or revocable preview link.",
        "If a browser frontend needs a backend URL, configure the frontend with the backend URL returned by this tool instead of localhost.",
      ],
      promptSnippet: "Get the raw E2B URL for a sandbox port",
    };
  }
}
