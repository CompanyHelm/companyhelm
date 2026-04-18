/**
 * @generated SignedSource<<82ab7dff1538d6de04e472d88f1a1f41>>
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
  routineId: string;
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
    readonly id: string;
    readonly routineId: string;
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
    "cacheID": "5ecf5b7d9858b97848908bf9ebfb9c8d",
    "id": null,
    "metadata": {},
    "name": "routinesPageCreateRoutineCronTriggerMutation",
    "operationKind": "mutation",
    "text": "mutation routinesPageCreateRoutineCronTriggerMutation(\n  $input: CreateRoutineCronTriggerInput!\n) {\n  CreateRoutineCronTrigger(input: $input) {\n    id\n    routineId\n    type\n    enabled\n    cronPattern\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "874bd1223ff19a012cba1f09663ca70b";

export default node;
