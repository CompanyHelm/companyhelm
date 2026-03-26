/**
 * @generated SignedSource<<7a5f1f95473fde0382f115610c8db6f7>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateTaskInput = {
  description?: string | null | undefined;
  name: string;
  status?: string | null | undefined;
  taskCategoryId?: string | null | undefined;
};
export type tasksPageCreateTaskMutation$variables = {
  input: CreateTaskInput;
};
export type tasksPageCreateTaskMutation$data = {
  readonly CreateTask: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly taskCategoryId: string | null | undefined;
    readonly taskCategoryName: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type tasksPageCreateTaskMutation = {
  response: tasksPageCreateTaskMutation$data;
  variables: tasksPageCreateTaskMutation$variables;
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
    "name": "CreateTask",
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
        "name": "taskCategoryId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "taskCategoryName",
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
    "name": "tasksPageCreateTaskMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "tasksPageCreateTaskMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7428e6b30f480df92a371e0d61914760",
    "id": null,
    "metadata": {},
    "name": "tasksPageCreateTaskMutation",
    "operationKind": "mutation",
    "text": "mutation tasksPageCreateTaskMutation(\n  $input: CreateTaskInput!\n) {\n  CreateTask(input: $input) {\n    id\n    name\n    description\n    status\n    taskCategoryId\n    taskCategoryName\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "ad13d1af4658828e9b6e5977ff7260bb";

export default node;
