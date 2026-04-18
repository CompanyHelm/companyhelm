/**
 * @generated SignedSource<<243f4bada18115b39382601d8679eca3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateRoutineInput = {
  assignedAgentId: string;
  enabled?: boolean | null | undefined;
  instructions: string;
  name: string;
};
export type routinesPageCreateRoutineMutation$variables = {
  input: CreateRoutineInput;
};
export type routinesPageCreateRoutineMutation$data = {
  readonly CreateRoutine: {
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
      readonly id: string;
      readonly routineId: string;
      readonly type: string;
      readonly updatedAt: string;
    }>;
    readonly updatedAt: string;
  };
};
export type routinesPageCreateRoutineMutation = {
  response: routinesPageCreateRoutineMutation$data;
  variables: routinesPageCreateRoutineMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
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
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "Routine",
    "kind": "LinkedField",
    "name": "CreateRoutine",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "name",
        "storageKey": null
      },
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
          (v1/*: any*/),
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
          (v1/*: any*/),
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "routinesPageCreateRoutineMutation",
    "selections": (v7/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "routinesPageCreateRoutineMutation",
    "selections": (v7/*: any*/)
  },
  "params": {
    "cacheID": "b0d10da6650c6221a9079479167204a6",
    "id": null,
    "metadata": {},
    "name": "routinesPageCreateRoutineMutation",
    "operationKind": "mutation",
    "text": "mutation routinesPageCreateRoutineMutation(\n  $input: CreateRoutineInput!\n) {\n  CreateRoutine(input: $input) {\n    id\n    name\n    instructions\n    assignedAgentId\n    assignedAgentName\n    sessionId\n    enabled\n    overlapPolicy\n    triggers {\n      id\n      routineId\n      type\n      enabled\n      cronPattern\n      createdAt\n      updatedAt\n    }\n    lastRun {\n      id\n      routineId\n      triggerId\n      source\n      status\n      sessionId\n      bullmqJobId\n      errorMessage\n      startedAt\n      finishedAt\n      createdAt\n      updatedAt\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "75420803edd28b00784f8a41742f3c09";

export default node;
