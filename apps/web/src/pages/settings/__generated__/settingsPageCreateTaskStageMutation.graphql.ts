/**
 * @generated SignedSource<<4d95b3544487f942af3e4a1bfd44cff2>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateTaskStageInput = {
  name: string;
};
export type settingsPageCreateTaskStageMutation$variables = {
  input: CreateTaskStageInput;
};
export type settingsPageCreateTaskStageMutation$data = {
  readonly CreateTaskStage: {
    readonly createdAt: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly taskCount: number;
    readonly updatedAt: string;
  };
};
export type settingsPageCreateTaskStageMutation = {
  response: settingsPageCreateTaskStageMutation$data;
  variables: settingsPageCreateTaskStageMutation$variables;
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
    "concreteType": "TaskStage",
    "kind": "LinkedField",
    "name": "CreateTaskStage",
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
        "name": "isDefault",
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
    "name": "settingsPageCreateTaskStageMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "settingsPageCreateTaskStageMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "0c8e271c088a1f15df9ad7f6929bfa0c",
    "id": null,
    "metadata": {},
    "name": "settingsPageCreateTaskStageMutation",
    "operationKind": "mutation",
    "text": "mutation settingsPageCreateTaskStageMutation(\n  $input: CreateTaskStageInput!\n) {\n  CreateTaskStage(input: $input) {\n    id\n    name\n    isDefault\n    taskCount\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "3f40958ba94f0024eb869bbbe23ad173";

export default node;
