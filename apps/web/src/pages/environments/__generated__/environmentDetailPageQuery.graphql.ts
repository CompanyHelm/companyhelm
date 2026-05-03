/**
 * @generated SignedSource<<1ab475d2bbe87e5c05dfed4bd4f1abe0>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type environmentDetailPageQuery$variables = {
  environmentId: string;
};
export type environmentDetailPageQuery$data = {
  readonly Environment: {
    readonly agentId: string;
    readonly agentName: string | null | undefined;
    readonly cpuCount: number;
    readonly cpuUsedPct: number | null | undefined;
    readonly createdAt: string;
    readonly diskSpaceGb: number;
    readonly diskUsedBytes: number | null | undefined;
    readonly displayName: string | null | undefined;
    readonly id: string;
    readonly lastSeenAt: string | null | undefined;
    readonly memUsedBytes: number | null | undefined;
    readonly memoryGb: number;
    readonly metricsSampledAt: string | null | undefined;
    readonly platform: string;
    readonly provider: string;
    readonly providerDefinitionId: string | null | undefined;
    readonly providerDefinitionName: string | null | undefined;
    readonly providerEnvironmentId: string;
    readonly status: string;
    readonly statusErrorMessage: string | null | undefined;
    readonly templateId: string;
    readonly updatedAt: string;
  };
};
export type environmentDetailPageQuery = {
  response: environmentDetailPageQuery$data;
  variables: environmentDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "environmentId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "environmentId"
      }
    ],
    "concreteType": "Environment",
    "kind": "LinkedField",
    "name": "Environment",
    "plural": false,
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
        "name": "templateId",
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
        "name": "statusErrorMessage",
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
        "name": "metricsSampledAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "cpuUsedPct",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "memUsedBytes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "diskUsedBytes",
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
        "name": "createdAt",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "environmentDetailPageQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentDetailPageQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "4f83128701b3066c6d28c4d9a375007a",
    "id": null,
    "metadata": {},
    "name": "environmentDetailPageQuery",
    "operationKind": "query",
    "text": "query environmentDetailPageQuery(\n  $environmentId: ID!\n) {\n  Environment(id: $environmentId) {\n    id\n    agentId\n    agentName\n    provider\n    providerDefinitionId\n    providerDefinitionName\n    providerEnvironmentId\n    templateId\n    displayName\n    platform\n    status\n    statusErrorMessage\n    cpuCount\n    memoryGb\n    diskSpaceGb\n    metricsSampledAt\n    cpuUsedPct\n    memUsedBytes\n    diskUsedBytes\n    lastSeenAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "59cb3eec94697601efee7acd3cf2c488";

export default node;
