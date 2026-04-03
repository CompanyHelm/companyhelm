/**
 * @generated SignedSource<<ed542dbc1b016a5c92a1fabe57f62512>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteTaskInput = {
  taskId: string;
};
export type tasksPageDeleteTaskMutation$variables = {
  input: DeleteTaskInput;
};
export type tasksPageDeleteTaskMutation$data = {
  readonly DeleteTask: {
    readonly id: string;
  };
};
export type tasksPageDeleteTaskMutation = {
  response: tasksPageDeleteTaskMutation$data;
  variables: tasksPageDeleteTaskMutation$variables;
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
    "name": "DeleteTask",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
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
    "name": "tasksPageDeleteTaskMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "tasksPageDeleteTaskMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "29196b8dcd191f9bcd3a252271186cf1",
    "id": null,
    "metadata": {},
    "name": "tasksPageDeleteTaskMutation",
    "operationKind": "mutation",
    "text": "mutation tasksPageDeleteTaskMutation(\n  $input: DeleteTaskInput!\n) {\n  DeleteTask(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "d821c6d2f24b35aa78cfc766d1c8e781";

export default node;
