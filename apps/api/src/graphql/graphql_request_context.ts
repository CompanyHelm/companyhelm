import type { FastifyRequest } from "fastify";

export type GraphqlRequestContext = {
  companyId: string | null;
};

/**
 * Normalizes GraphQL request headers into a tiny shared resolver context.
 */
export class GraphqlRequestContextResolver {
  static resolve(request: FastifyRequest): GraphqlRequestContext {
    const headerValue = request.headers["x-company-id"];
    const normalizedHeaderValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const companyId = String(normalizedHeaderValue || "").trim();

    return {
      companyId: companyId || null,
    };
  }
}
