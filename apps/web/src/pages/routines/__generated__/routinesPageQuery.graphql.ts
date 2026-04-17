/**
 * @generated SignedSource<<ea84c714856978ab23d49e3070488485>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type routinesPageQuery$variables = Record<PropertyKey, never>;
export type routinesPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Routines: ReadonlyArray<{
    readonly assignedAgentId: string;
    readonly assignedAgentName: string;
    readonly createdAt: string;
    readonly enabled: boolean;
    readonly id: string;
    readonly instructions: string;
    readonly lastRun: {
      readonly bullmqJobId: string | null | undefined;
      readonly createdAt: string;
      readonly errorMessage: string | null | undefined;
      readonly finishedAt: string | null | undefined;
      readonly id: string;
      readonly routineId: string;
      readonly sessionId: string | null | undefined;
      readonly source: string;
      readonly startedAt: string | null | undefined;
      readonly status: string;
      readonly triggerId: string | null | undefined;
      readonly updatedAt: string;
    } | null | undefined;
    readonly name: string;
    readonly overlapPolicy: string;
    readonly sessionId: string | null | undefined;
    readonly triggers: ReadonlyArray<{
      readonly createdAt: string;
      readonly cronPattern: string;
      readonly enabled: boolean;
      readonly endAt: string | null | undefined;
      readonly id: string;
      readonly limit: number | null | undefined;
      readonly routineId: string;
      readonly startAt: string | null | undefined;
      readonly timezone: string;
      readonly type: string;
      readonly updatedAt: string;
    }>;
    readonly updatedAt: string;
  }>;
};
export type routinesPageQuery = {
  response: routinesPageQuery$data;
  variables: routinesPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "sessionId",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "enabled",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "routineId",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v7 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Routine",
    "kind": "LinkedField",
    "name": "Routines",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "instructions",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "assignedAgentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "assignedAgentName",
        "storageKey": null
      },
      (v2/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "overlapPolicy",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "RoutineCronTrigger",
        "kind": "LinkedField",
        "name": "triggers",
        "plural": true,
        "selections": [
          (v0/*: any*/),
          (v4/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "type",
            "storageKey": null
          },
          (v3/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "cronPattern",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "timezone",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "startAt",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endAt",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "limit",
            "storageKey": null
          },
          (v5/*: any*/),
          (v6/*: any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "RoutineRun",
        "kind": "LinkedField",
        "name": "lastRun",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v4/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "triggerId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "source",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "status",
            "storageKey": null
          },
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "bullmqJobId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "errorMessage",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "startedAt",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "finishedAt",
            "storageKey": null
          },
          (v5/*: any*/),
          (v6/*: any*/)
        ],
        "storageKey": null
      },
      (v5/*: any*/),
      (v6/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "routinesPageQuery",
    "selections": (v7/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "routinesPageQuery",
    "selections": (v7/*: any*/)
  },
  "params": {
    "cacheID": "42d4e44f1f35143169e346f0ebb481e5",
    "id": null,
    "metadata": {},
    "name": "routinesPageQuery",
    "operationKind": "query",
    "text": "query routinesPageQuery {\n  Agents {\n    id\n    name\n  }\n  Routines {\n    id\n    name\n    instructions\n    assignedAgentId\n    assignedAgentName\n    sessionId\n    enabled\n    overlapPolicy\n    triggers {\n      id\n      routineId\n      type\n      enabled\n      cronPattern\n      timezone\n      startAt\n      endAt\n      limit\n      createdAt\n      updatedAt\n    }\n    lastRun {\n      id\n      routineId\n      triggerId\n      source\n      status\n      sessionId\n      bullmqJobId\n      errorMessage\n      startedAt\n      finishedAt\n      createdAt\n      updatedAt\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "76c76bcdc838ae5e80f08b6383342350";

export default node;
