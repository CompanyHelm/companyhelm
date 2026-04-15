/**
 * @generated SignedSource<<a932b0dd3b497c11dc461cb4c7023666>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetTaskStageInput = {
  taskId: string;
  taskStageId?: string | null | undefined;
};
export type tasksPageSetTaskStageMutation$variables = {
  input: SetTaskStageInput;
};
export type tasksPageSetTaskStageMutation$data = {
  readonly SetTaskStage: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly taskStageId: string | null | undefined;
    readonly taskStageName: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type tasksPageSetTaskStageMutation = {
  response: tasksPageSetTaskStageMutation$data;
  variables: tasksPageSetTaskStageMutation$variables;
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
    "concreteType": "Task",
    "kind": "LinkedField",
    "name": "SetTaskStage",
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
        "name": "name",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
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
        "name": "taskStageId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "taskStageName",
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
    "name": "tasksPageSetTaskStageMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "tasksPageSetTaskStageMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "20587ce83f7a012588de54beb928d24f",
    "id": null,
    "metadata": {},
    "name": "tasksPageSetTaskStageMutation",
    "operationKind": "mutation",
    "text": "mutation tasksPageSetTaskStageMutation(\n  $input: SetTaskStageInput!\n) {\n  SetTaskStage(input: $input) {\n    id\n    name\n    description\n    status\n    taskStageId\n    taskStageName\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "0f47c5d9149c1230fc6c2dcaad38c0e7";

export default node;
