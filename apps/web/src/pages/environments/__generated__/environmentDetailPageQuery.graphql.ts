/**
 * @generated SignedSource<<1ec4b5dc864c0c0bb3b68bac9f2ee697>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type environmentDetailPageQuery$variables = {
  endTime: string;
  environmentId: string;
  startTime: string;
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
    readonly templateId: string;
    readonly updatedAt: string;
  };
  readonly EnvironmentMetricSamples: ReadonlyArray<{
    readonly cpuUsedPct: number | null | undefined;
    readonly diskUsedBytes: number | null | undefined;
    readonly memUsedBytes: number | null | undefined;
    readonly sampledAt: string;
  }>;
};
export type environmentDetailPageQuery = {
  response: environmentDetailPageQuery$data;
  variables: environmentDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "endTime"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "environmentId"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "startTime"
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "cpuUsedPct",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "memUsedBytes",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "diskUsedBytes",
  "storageKey": null
},
v6 = [
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
      (v3/*: any*/),
      (v4/*: any*/),
      (v5/*: any*/),
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
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "endTime",
        "variableName": "endTime"
      },
      {
        "kind": "Variable",
        "name": "environmentId",
        "variableName": "environmentId"
      },
      {
        "kind": "Variable",
        "name": "startTime",
        "variableName": "startTime"
      }
    ],
    "concreteType": "EnvironmentMetricSample",
    "kind": "LinkedField",
    "name": "EnvironmentMetricSamples",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sampledAt",
        "storageKey": null
      },
      (v3/*: any*/),
      (v4/*: any*/),
      (v5/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "environmentDetailPageQuery",
    "selections": (v6/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "environmentDetailPageQuery",
    "selections": (v6/*: any*/)
  },
  "params": {
    "cacheID": "40cf800351bc2e364dedec359d0fa510",
    "id": null,
    "metadata": {},
    "name": "environmentDetailPageQuery",
    "operationKind": "query",
    "text": "query environmentDetailPageQuery(\n  $environmentId: ID!\n  $startTime: String!\n  $endTime: String!\n) {\n  Environment(id: $environmentId) {\n    id\n    agentId\n    agentName\n    provider\n    providerDefinitionId\n    providerDefinitionName\n    providerEnvironmentId\n    templateId\n    displayName\n    platform\n    status\n    cpuCount\n    memoryGb\n    diskSpaceGb\n    metricsSampledAt\n    cpuUsedPct\n    memUsedBytes\n    diskUsedBytes\n    lastSeenAt\n    createdAt\n    updatedAt\n  }\n  EnvironmentMetricSamples(environmentId: $environmentId, startTime: $startTime, endTime: $endTime) {\n    sampledAt\n    cpuUsedPct\n    memUsedBytes\n    diskUsedBytes\n  }\n}\n"
  }
};
})();

(node as any).hash = "46d305ef50b94ab53426f8a448e8bf98";

export default node;
