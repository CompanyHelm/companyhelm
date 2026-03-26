/**
 * @generated SignedSource<<5c57bfa175e062c2b5f04e3f165692ac>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateTaskCategoryInput = {
  name: string;
};
export type settingsPageCreateTaskCategoryMutation$variables = {
  input: CreateTaskCategoryInput;
};
export type settingsPageCreateTaskCategoryMutation$data = {
  readonly CreateTaskCategory: {
    readonly createdAt: string;
    readonly id: string;
    readonly name: string;
    readonly taskCount: number;
    readonly updatedAt: string;
  };
};
export type settingsPageCreateTaskCategoryMutation = {
  response: settingsPageCreateTaskCategoryMutation$data;
  variables: settingsPageCreateTaskCategoryMutation$variables;
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
    "concreteType": "TaskCategory",
    "kind": "LinkedField",
    "name": "CreateTaskCategory",
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
        "name": "taskCount",
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
    "name": "settingsPageCreateTaskCategoryMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "settingsPageCreateTaskCategoryMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7cc9892add8e7cf796342a880d8f1698",
    "id": null,
    "metadata": {},
    "name": "settingsPageCreateTaskCategoryMutation",
    "operationKind": "mutation",
    "text": "mutation settingsPageCreateTaskCategoryMutation(\n  $input: CreateTaskCategoryInput!\n) {\n  CreateTaskCategory(input: $input) {\n    id\n    name\n    taskCount\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "0577d077e312205a4103dfc1e15abefd";

export default node;
