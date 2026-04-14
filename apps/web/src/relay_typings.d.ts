declare module "relay-runtime" {
  export type GraphQLTaggedNode = object;

  export type IEnvironment = object;

  export type RequestParameters = {
    name: string;
    text: string | null | undefined;
  };

  export type OperationDescriptor = {
    fragment: object;
  };

  export type Snapshot = {
    data: unknown;
  };

  export interface RecordProxy {
    getDataID(): string;
    getLinkedRecord(name: string, args?: Record<string, unknown>): RecordProxy | null;
    getLinkedRecords(name: string, args?: Record<string, unknown>): ReadonlyArray<unknown> | null;
    getValue(name: string): unknown;
    setValue(value: unknown, name: string): void;
    setLinkedRecord(record: RecordProxy | null, name: string, args?: Record<string, unknown>): void;
    setLinkedRecords(records: ReadonlyArray<unknown>, name: string, args?: Record<string, unknown>): void;
  }

  export interface RootRecordProxy extends RecordProxy {
    getLinkedRecords(name: string, args?: Record<string, unknown>): ReadonlyArray<unknown> | null;
    setLinkedRecord(record: RecordProxy | null, name: string, args?: Record<string, unknown>): void;
    setLinkedRecords(records: ReadonlyArray<unknown>, name: string, args?: Record<string, unknown>): void;
  }

  export interface RecordSourceSelectorProxy {
    delete?(dataId: string): void;
    get(dataId: string): RecordProxy | null;
    getRoot(): RootRecordProxy;
    getRootField(name: string): RecordProxy | null | undefined;
    getPluralRootField(name: string): ReadonlyArray<RecordProxy | null> | null | undefined;
  }

  export class Observable<T> {
    private readonly __value?: T;

    static create<T>(source: (sink: {
      next(value: T): void;
      error(error: Error): void;
      complete(): void;
    }) => (() => void) | { dispose?(): void } | void): Observable<T>;
  }

  export class RecordSource {}

  export class Store {
    constructor(source: RecordSource);
  }

  export const Network: {
    create(
      fetchFn: (parameters: RequestParameters, variables: unknown) => Promise<unknown>,
      subscribeFn?: (parameters: RequestParameters, variables: unknown) => Observable<unknown>,
    ): unknown;
  };

  export class Environment {
    constructor(config: {
      network: unknown;
      store: Store;
    });
    lookup(fragment: object): Snapshot;
    retain(operation: OperationDescriptor): { dispose(): void };
  }

  export function getRequest(query: unknown): object;

  export function createOperationDescriptor(
    request: object,
    variables: Record<string, unknown>,
    cacheConfig?: unknown,
  ): OperationDescriptor;
}

declare module "react-relay" {
  import type { GraphQLTaggedNode, IEnvironment, RecordSourceSelectorProxy } from "relay-runtime";
  import type { ComponentType, ReactNode } from "react";

  type RelayOperation = {
    readonly response: unknown;
    readonly variables: unknown;
  };

  type RelayResponse<TOperation extends RelayOperation> = TOperation["response"];
  type RelayVariables<TOperation extends RelayOperation> = TOperation["variables"];
  type RelayErrorRecord = {
    readonly message: string;
  };

  export function graphql(source: TemplateStringsArray, ...substitutions: unknown[]): GraphQLTaggedNode;

  export function useRelayEnvironment(): IEnvironment;

  export function useLazyLoadQuery<TOperation extends RelayOperation>(
    query: GraphQLTaggedNode,
    variables: RelayVariables<TOperation>,
    options?: {
      fetchKey?: string | number;
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
      fetchKey?: string | number;
      fetchPolicy?: string;
    },
  ): {
    toPromise(): Promise<RelayResponse<TOperation> | null | undefined>;
  };

  export const RelayEnvironmentProvider: ComponentType<{
    children?: ReactNode;
    environment: IEnvironment;
  }>;

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
