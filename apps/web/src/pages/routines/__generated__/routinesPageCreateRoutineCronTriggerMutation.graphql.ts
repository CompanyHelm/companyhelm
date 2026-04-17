/**
 * @generated SignedSource<<db4110d371d7a1824b48f15feab55c90>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateRoutineCronTriggerInput = {
  cronPattern: string;
  enabled?: boolean | null | undefined;
  endAt?: string | null | undefined;
  limit?: number | null | undefined;
  routineId: string;
  startAt?: string | null | undefined;
  timezone: string;
};
export type routinesPageCreateRoutineCronTriggerMutation$variables = {
  input: CreateRoutineCronTriggerInput;
};
export type routinesPageCreateRoutineCronTriggerMutation$data = {
  readonly CreateRoutineCronTrigger: {
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
  };
};
export type routinesPageCreateRoutineCronTriggerMutation = {
  response: routinesPageCreateRoutineCronTriggerMutation$data;
  variables: routinesPageCreateRoutineCronTriggerMutation$variables;
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
    "concreteType": "RoutineCronTrigger",
    "kind": "LinkedField",
    "name": "CreateRoutineCronTrigger",
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
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "enabled",
        "storageKey": null
      },
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
    "name": "routinesPageCreateRoutineCronTriggerMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "routinesPageCreateRoutineCronTriggerMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "47895397f976569b0df9ca5e1c2d5d32",
    "id": null,
    "metadata": {},
    "name": "routinesPageCreateRoutineCronTriggerMutation",
    "operationKind": "mutation",
    "text": "mutation routinesPageCreateRoutineCronTriggerMutation(\n  $input: CreateRoutineCronTriggerInput!\n) {\n  CreateRoutineCronTrigger(input: $input) {\n    id\n    routineId\n    type\n    enabled\n    cronPattern\n    timezone\n    startAt\n    endAt\n    limit\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "350508f6fb221e12a8530b644849bdfa";

export default node;
