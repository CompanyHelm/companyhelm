/**
 * @generated SignedSource<<104b3098ae65239bb539e8485d6b78c0>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateRoutineCronTriggerInput = {
  cronPattern?: string | null | undefined;
  enabled?: boolean | null | undefined;
  id: string;
  timezone?: string | null | undefined;
};
export type routinesPageUpdateRoutineCronTriggerMutation$variables = {
  input: UpdateRoutineCronTriggerInput;
};
export type routinesPageUpdateRoutineCronTriggerMutation$data = {
  readonly UpdateRoutineCronTrigger: {
    readonly createdAt: string;
    readonly cronPattern: string;
    readonly enabled: boolean;
    readonly id: string;
    readonly routineId: string;
    readonly type: string;
    readonly updatedAt: string;
  };
};
export type routinesPageUpdateRoutineCronTriggerMutation = {
  response: routinesPageUpdateRoutineCronTriggerMutation$data;
  variables: routinesPageUpdateRoutineCronTriggerMutation$variables;
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
    "name": "UpdateRoutineCronTrigger",
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
    "name": "routinesPageUpdateRoutineCronTriggerMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "routinesPageUpdateRoutineCronTriggerMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "1e26397ebe329912af71ae1004e2afd9",
    "id": null,
    "metadata": {},
    "name": "routinesPageUpdateRoutineCronTriggerMutation",
    "operationKind": "mutation",
    "text": "mutation routinesPageUpdateRoutineCronTriggerMutation(\n  $input: UpdateRoutineCronTriggerInput!\n) {\n  UpdateRoutineCronTrigger(input: $input) {\n    id\n    routineId\n    type\n    enabled\n    cronPattern\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "c41c7c30af8a74390c110ea485012df4";

export default node;
