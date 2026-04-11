declare module "relay-runtime" {
  export type GraphQLTaggedNode = object;

  export type IEnvironment = object;

  export interface RecordProxy {
    getDataID(): string;
  }

  export interface RootRecordProxy {
    getLinkedRecords(name: string, args?: Record<string, unknown>): ReadonlyArray<RecordProxy | null> | null;
    setLinkedRecords(records: ReadonlyArray<RecordProxy>, name: string, args?: Record<string, unknown>): void;
  }

  export interface RecordSourceSelectorProxy {
    getRoot(): RootRecordProxy;
    getRootField(name: string): RecordProxy | null;
  }
}

declare module "react-relay" {
  import type { GraphQLTaggedNode, IEnvironment, RecordSourceSelectorProxy } from "relay-runtime";

  type RelayOperation = {
    readonly response: unknown;
    readonly variables: unknown;
  };

  type RelayResponse<TOperation extends RelayOperation> = TOperation["response"];
  type RelayVariables<TOperation extends RelayOperation> = TOperation["variables"];
  type RelayErrorRecord = {
    readonly message?: string | null;
  };

  export function graphql(source: TemplateStringsArray, ...substitutions: unknown[]): GraphQLTaggedNode;

  export function useRelayEnvironment(): IEnvironment;

  export function useLazyLoadQuery<TOperation extends RelayOperation>(
    query: GraphQLTaggedNode,
    variables: RelayVariables<TOperation>,
    options?: {
      fetchPolicy?: string;
    },
  ): RelayResponse<TOperation>;

  export function useMutation<TOperation extends RelayOperation>(
    mutation: GraphQLTaggedNode,
  ): [
    (config: {
      variables: RelayVariables<TOperation>;
      updater?: (store: RecordSourceSelectorProxy) => void;
      onCompleted?: (
        response: RelayResponse<TOperation>,
        errors?: ReadonlyArray<RelayErrorRecord> | null,
      ) => void;
      onError?: (error: Error) => void;
    }) => void,
    boolean,
  ];

  export function fetchQuery<TOperation extends RelayOperation>(
    environment: IEnvironment,
    query: GraphQLTaggedNode,
    variables: RelayVariables<TOperation>,
    options?: {
      fetchPolicy?: string;
    },
  ): {
    toPromise(): Promise<RelayResponse<TOperation> | null | undefined>;
  };

  export function requestSubscription<TOperation extends RelayOperation>(
    environment: IEnvironment,
    config: {
      subscription: GraphQLTaggedNode;
      variables: RelayVariables<TOperation>;
      updater?: (store: RecordSourceSelectorProxy) => void;
      onNext?: (response: RelayResponse<TOperation> | null | undefined) => void;
      onError?: (error: Error) => void;
    },
  ): {
    dispose(): void;
  };
}
