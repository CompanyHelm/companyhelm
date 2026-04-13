import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  McpAuthTypeDetectionService,
  type McpServerAuthTypeDetection,
} from "../../services/mcp/auth_type_detection.ts";

type McpServerAuthTypeQueryArguments = {
  url: string;
};

/**
 * Probes a remote MCP server through the backend so the web dialog can preselect supported OAuth
 * auth types without requiring the browser to perform discovery itself.
 */
@injectable()
export class McpServerAuthTypeQueryResolver {
  private readonly authTypeDetectionService: McpAuthTypeDetectionService;

  constructor(@inject(McpAuthTypeDetectionService) authTypeDetectionService: McpAuthTypeDetectionService) {
    this.authTypeDetectionService = authTypeDetectionService;
  }

  execute = async (
    _root: unknown,
    arguments_: McpServerAuthTypeQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<McpServerAuthTypeDetection> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }

    return this.authTypeDetectionService.detect({
      url: arguments_.url,
    });
  };
}
