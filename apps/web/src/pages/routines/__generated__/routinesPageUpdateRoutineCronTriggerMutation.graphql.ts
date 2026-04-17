/**
 * @generated SignedSource<<031abfa4a35033dd400eb309a0c3d4a4>>
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
  endAt?: string | null | undefined;
  id: string;
  limit?: number | null | undefined;
  startAt?: string | null | undefined;
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
    "cacheID": "629d477b28eb98905836067f08501bf7",
    "id": null,
    "metadata": {},
    "name": "routinesPageUpdateRoutineCronTriggerMutation",
    "operationKind": "mutation",
    "text": "mutation routinesPageUpdateRoutineCronTriggerMutation(\n  $input: UpdateRoutineCronTriggerInput!\n) {\n  UpdateRoutineCronTrigger(input: $input) {\n    id\n    routineId\n    type\n    enabled\n    cronPattern\n    timezone\n    startAt\n    endAt\n    limit\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "66ed0b3a75dab2b04752a9bcfb3f3e88";

export default node;
