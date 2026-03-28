/**
 * @generated SignedSource<<68369dff883c304f423d16fa4a0c6445>>
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
    "cacheID": "637774c52314de803eab9257ba14db7c",
    "id": null,
    "metadata": {},
    "name": "environmentsPageQuery",
    "operationKind": "query",
    "text": "query environmentsPageQuery {\n  Environments {\n    id\n    agentId\n    agentName\n    provider\n    providerEnvironmentId\n    displayName\n    platform\n    status\n    cpuCount\n    memoryGb\n    diskSpaceGb\n    lastSeenAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "830d2599533adbb407920261ef831493";

export default node;
