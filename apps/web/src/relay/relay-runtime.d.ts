declare module "relay-runtime" {
  export interface GraphQLResponse {
    data?: unknown;
    errors?: unknown;
  }

  export interface RequestParameters {
    id: string | null;
    metadata: Record<string, unknown>;
    name: string;
    operationKind: string;
    text?: string | null;
  }

  export type Variables = Record<string, unknown>;

  export class RecordSource {
    constructor(records?: Record<string, unknown>);
  }

  export class Store {
    constructor(source: RecordSource);
  }

  export class Network {
    static create(fetchGraphQL: (params: RequestParameters, variables: Variables) => Promise<GraphQLResponse>): unknown;
  }

  export class Environment {
    constructor(config: {
      network: unknown;
      store: Store;
    });
  }
}
