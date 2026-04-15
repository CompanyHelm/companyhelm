/**
 * @generated SignedSource<<f5270de5dfc44b2d3bd842f076b779b3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteTaskStageInput = {
  id: string;
};
export type settingsPageDeleteTaskStageMutation$variables = {
  input: DeleteTaskStageInput;
};
export type settingsPageDeleteTaskStageMutation$data = {
  readonly DeleteTaskStage: {
    readonly createdAt: string;
    readonly id: string;
    readonly name: string;
    readonly taskCount: number;
    readonly updatedAt: string;
  };
};
export type settingsPageDeleteTaskStageMutation = {
  response: settingsPageDeleteTaskStageMutation$data;
  variables: settingsPageDeleteTaskStageMutation$variables;
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
    "name": "DeleteTaskStage",
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
    "name": "settingsPageDeleteTaskStageMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "settingsPageDeleteTaskStageMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "d9f250f69f1a5e3fef97910f727c9857",
    "id": null,
    "metadata": {},
    "name": "settingsPageDeleteTaskStageMutation",
    "operationKind": "mutation",
    "text": "mutation settingsPageDeleteTaskStageMutation(\n  $input: DeleteTaskStageInput!\n) {\n  DeleteTaskStage(input: $input) {\n    id\n    name\n    taskCount\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "344a76ed2e0b5ff62090825b5058b1fe";

export default node;
