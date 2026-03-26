/**
 * @generated SignedSource<<91a346a53851be96723fcc010a3cfe1b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetTaskCategoryInput = {
  taskCategoryId?: string | null | undefined;
  taskId: string;
};
export type tasksPageSetTaskCategoryMutation$variables = {
  input: SetTaskCategoryInput;
};
export type tasksPageSetTaskCategoryMutation$data = {
  readonly SetTaskCategory: {
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
export type tasksPageSetTaskCategoryMutation = {
  response: tasksPageSetTaskCategoryMutation$data;
  variables: tasksPageSetTaskCategoryMutation$variables;
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
    "name": "SetTaskCategory",
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
    "name": "tasksPageSetTaskCategoryMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "tasksPageSetTaskCategoryMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "010c775e3aae1d6732a73323ec029b70",
    "id": null,
    "metadata": {},
    "name": "tasksPageSetTaskCategoryMutation",
    "operationKind": "mutation",
    "text": "mutation tasksPageSetTaskCategoryMutation(\n  $input: SetTaskCategoryInput!\n) {\n  SetTaskCategory(input: $input) {\n    id\n    name\n    description\n    status\n    taskCategoryId\n    taskCategoryName\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b0fee0b983a4f81afe8a63e1f78b6212";

export default node;
