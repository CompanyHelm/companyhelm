/**
 * @generated SignedSource<<0dc2fdd31a461e1218f77ac34c0af14d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type environmentsPageQuery$variables = Record<PropertyKey, never>;
export type environmentsPageQuery$data = {
  readonly Environments: ReadonlyArray<{
    readonly agentId: string;
    readonly agentName: string | null | undefined;
    readonly cpuCount: number;
    readonly diskSpaceGb: number;
    readonly displayName: string | null | undefined;
    readonly id: string;
    readonly lastSeenAt: string | null | undefined;
    readonly memoryGb: number;
    readonly platform: string;
    readonly provider: string;
    readonly providerDefinitionId: string | null | undefined;
    readonly providerDefinitionName: string | null | undefined;
    readonly providerEnvironmentId: string;
    readonly status: string;
    readonly updatedAt: string;
  }>;
};
export type environmentsPageQuery = {
  response: environmentsPageQuery$data;
  variables: environmentsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Environment",
    "kind": "LinkedField",
    "name": "Environments",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "agentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "agentName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "provider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "providerDefinitionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "providerDefinitionName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "providerEnvironmentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "displayName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "platform",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "cpuCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "memoryGb",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "diskSpaceGb",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastSeenAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "environmentsPageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "environmentsPageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "4e4630ec0067a56ec5dc3999f27b22e1",
    "id": null,
    "metadata": {},
    "name": "environmentsPageQuery",
    "operationKind": "query",
    "text": "query environmentsPageQuery {\n  Environments {\n    id\n    agentId\n    agentName\n    provider\n    providerDefinitionId\n    providerDefinitionName\n    providerEnvironmentId\n    displayName\n    platform\n    status\n    cpuCount\n    memoryGb\n    diskSpaceGb\n    lastSeenAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "1a0e79e979adf66bfb93b9b4d6b593e6";

export default node;
