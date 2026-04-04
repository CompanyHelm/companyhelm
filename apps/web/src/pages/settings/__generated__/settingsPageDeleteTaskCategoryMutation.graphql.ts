/**
 * @generated SignedSource<<384462c204f5de6c03909eb93614af06>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteTaskCategoryInput = {
  id: string;
};
export type settingsPageDeleteTaskCategoryMutation$variables = {
  input: DeleteTaskCategoryInput;
};
export type settingsPageDeleteTaskCategoryMutation$data = {
  readonly DeleteTaskCategory: {
    readonly createdAt: string;
    readonly id: string;
    readonly name: string;
    readonly taskCount: number;
    readonly updatedAt: string;
  };
};
export type settingsPageDeleteTaskCategoryMutation = {
  response: settingsPageDeleteTaskCategoryMutation$data;
  variables: settingsPageDeleteTaskCategoryMutation$variables;
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
    "name": "DeleteTaskCategory",
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
    "name": "settingsPageDeleteTaskCategoryMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "settingsPageDeleteTaskCategoryMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "6123086a47e1c185223855daf50bac38",
    "id": null,
    "metadata": {},
    "name": "settingsPageDeleteTaskCategoryMutation",
    "operationKind": "mutation",
    "text": "mutation settingsPageDeleteTaskCategoryMutation(\n  $input: DeleteTaskCategoryInput!\n) {\n  DeleteTaskCategory(input: $input) {\n    id\n    name\n    taskCount\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b5834391e0c44217eda50718258abfdf";

export default node;
