/**
 * @generated SignedSource<<d0fb1b27f2a082729b2f91ce90d38aac>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type environmentMetricsTabQuery$variables = {
  endTime: string;
  environmentId: string;
  startTime: string;
};
export type environmentMetricsTabQuery$data = {
  readonly EnvironmentMetricSamples: ReadonlyArray<{
    readonly cpuUsedPct: number | null | undefined;
    readonly diskUsedBytes: number | null | undefined;
    readonly memUsedBytes: number | null | undefined;
    readonly sampledAt: string;
  }>;
};
export type environmentMetricsTabQuery = {
  response: environmentMetricsTabQuery$data;
  variables: environmentMetricsTabQuery$variables;
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
v3 = [
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
      }
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
    "name": "environmentMetricsTabQuery",
    "selections": (v3/*: any*/),
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
    "name": "environmentMetricsTabQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "18c94057b7ff6c4af9947ec78eb60571",
    "id": null,
    "metadata": {},
    "name": "environmentMetricsTabQuery",
    "operationKind": "query",
    "text": "query environmentMetricsTabQuery(\n  $environmentId: ID!\n  $startTime: String!\n  $endTime: String!\n) {\n  EnvironmentMetricSamples(environmentId: $environmentId, startTime: $startTime, endTime: $endTime) {\n    sampledAt\n    cpuUsedPct\n    memUsedBytes\n    diskUsedBytes\n  }\n}\n"
  }
};
})();

(node as any).hash = "2eb24725d1303f364a69bafd6650d3cf";

export default node;
