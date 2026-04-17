/**
 * @generated SignedSource<<e0f6126f6a34bc2da4547c755f0bda5f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TriggerRoutineInput = {
  id: string;
};
export type routinesPageTriggerRoutineMutation$variables = {
  input: TriggerRoutineInput;
};
export type routinesPageTriggerRoutineMutation$data = {
  readonly TriggerRoutine: {
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
  };
};
export type routinesPageTriggerRoutineMutation = {
  response: routinesPageTriggerRoutineMutation$data;
  variables: routinesPageTriggerRoutineMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "RoutineRun",
    "kind": "LinkedField",
    "name": "TriggerRoutine",
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
        "name": "routineId",
        "storageKey": null
      },
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
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sessionId",
        "storageKey": null
      },
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
    "name": "routinesPageTriggerRoutineMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "routinesPageTriggerRoutineMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "a5bc1ad61bd9ef4fccee090a206f609e",
    "id": null,
    "metadata": {},
    "name": "routinesPageTriggerRoutineMutation",
    "operationKind": "mutation",
    "text": "mutation routinesPageTriggerRoutineMutation(\n  $input: TriggerRoutineInput!\n) {\n  TriggerRoutine(input: $input) {\n    id\n    routineId\n    triggerId\n    source\n    status\n    sessionId\n    bullmqJobId\n    errorMessage\n    startedAt\n    finishedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "33a1a6eb0380c3bf153b60819fec4658";

export default node;
