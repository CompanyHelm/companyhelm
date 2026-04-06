import type { MercuriusContext } from "mercurius";
import pino, { type Logger as PinoLogger } from "pino";
import { GraphQLError, type ExecutionResult, type GraphQLFormattedError } from "graphql";
import { inject, injectable } from "inversify";
import { ApiLogger } from "../log/api_logger.ts";
import type { GraphqlRequestContext } from "./graphql_request_context.ts";

export type GraphqlExecutionResult = ExecutionResult &
  Required<Pick<ExecutionResult, "errors">> & {
    statusCode?: number;
  };

export type GraphqlExecutionContext = GraphqlRequestContext & MercuriusContext;

type ErrorWithNestedErrors = Error & {
  errors?: unknown[];
  extensions?: unknown;
  statusCode?: number;
};

type GraphqlFormattedResponse = {
  data: ExecutionResult["data"] | null;
  errors: GraphQLFormattedError[];
};

/**
 * Logs GraphQL failures at error level with request and tenancy context, then formats a
 * spec-compliant response so resolver and transport failures remain visible without changing the
 * payload shape the web expects.
 */
@injectable()
export class GraphqlErrorLogger {
  private readonly logger: PinoLogger;

  constructor(
    @inject(ApiLogger)
    apiLogger: ApiLogger = GraphqlErrorLogger.createFallbackApiLogger(),
  ) {
    this.logger = apiLogger.child({
      component: "graphql_error_logger",
    });
  }

  logAndFormat(
    execution: GraphqlExecutionResult,
    context: GraphqlExecutionContext,
  ): {
    statusCode: number;
    response: GraphqlFormattedResponse;
  } {
    const formattedErrors = execution.errors.flatMap((error) => this.unwrapGraphqlErrors(error)).map((error) => error.toJSON());
    const primaryError = execution.errors[0];

    this.logger.error(
      {
        companyId: context.authSession?.company?.id ?? null,
        error: primaryError?.originalError ?? primaryError,
        graphqlErrors: formattedErrors,
        operationId: context.operationId ?? null,
        operationName: this.resolveOperationName(context.reply.request.body),
        query: context.__currentQuery,
        requestId: context.reply.request.id,
        requestMethod: context.reply.request.method,
        requestUrl: context.reply.request.url,
        userId: context.authSession?.user?.id ?? null,
      },
      "graphql request failed",
    );

    return {
      statusCode: this.resolveStatusCode(execution),
      response: {
        data: execution.data ?? null,
        errors: formattedErrors,
      },
    };
  }

  private resolveOperationName(body: unknown): string | null {
    if (!body || typeof body !== "object" || !("operationName" in body)) {
      return null;
    }

    const operationName = body.operationName;
    return typeof operationName === "string" ? operationName : null;
  }

  private resolveStatusCode(execution: GraphqlExecutionResult): number {
    let statusCode = execution.data ? 200 : (execution.statusCode ?? 200);

    if (!execution.data && typeof execution.statusCode === "undefined" && execution.errors.length === 1) {
      const originalError = execution.errors[0]?.originalError as ErrorWithNestedErrors | undefined;
      statusCode = typeof originalError?.statusCode === "number" ? originalError.statusCode : 200;
    }

    return statusCode;
  }

  private unwrapGraphqlErrors(error: GraphQLError): GraphQLError[] {
    const originalError = error.originalError as ErrorWithNestedErrors | undefined;
    if (!originalError?.errors || !Array.isArray(originalError.errors)) {
      return [error];
    }

    return originalError.errors.map((nestedError) => this.toGraphqlError(nestedError));
  }

  private toGraphqlError(error: unknown): GraphQLError {
    if (error instanceof GraphQLError) {
      return error;
    }

    const graphQLErrorSource = error as Partial<GraphQLError> & ErrorWithNestedErrors;
    return new GraphQLError(
      graphQLErrorSource.message ?? "Unknown GraphQL error.",
      {
        extensions: typeof graphQLErrorSource.extensions === "object" ? graphQLErrorSource.extensions as never : undefined,
        nodes: graphQLErrorSource.nodes,
        originalError: graphQLErrorSource instanceof Error ? graphQLErrorSource : undefined,
        path: graphQLErrorSource.path,
        positions: graphQLErrorSource.positions,
        source: graphQLErrorSource.source,
      },
    );
  }

  private static createFallbackApiLogger(): ApiLogger {
    return {
      child() {
        return pino({
          level: "silent",
        });
      },
      getLogger() {
        return pino({
          level: "silent",
        });
      },
    } as never;
  }
}
