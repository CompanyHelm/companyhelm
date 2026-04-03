/**
 * @generated SignedSource<<80aa4d05ef9301b8e2ebad6f74842117>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ExecuteTaskInput = {
  taskId: string;
};
export type tasksPageExecuteTaskMutation$variables = {
  input: ExecuteTaskInput;
};
export type tasksPageExecuteTaskMutation$data = {
  readonly ExecuteTask: {
    readonly id: string;
    readonly sessionId: string | null | undefined;
    readonly status: string;
    readonly taskId: string;
  };
};
export type tasksPageExecuteTaskMutation = {
  response: tasksPageExecuteTaskMutation$data;
  variables: tasksPageExecuteTaskMutation$variables;
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
    "concreteType": "TaskRun",
    "kind": "LinkedField",
    "name": "ExecuteTask",
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
        "name": "taskId",
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
        "name": "sessionId",
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
    "name": "tasksPageExecuteTaskMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "tasksPageExecuteTaskMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "fdb39e51d727752d0bd1de4870d70954",
    "id": null,
    "metadata": {},
    "name": "tasksPageExecuteTaskMutation",
    "operationKind": "mutation",
    "text": "mutation tasksPageExecuteTaskMutation(\n  $input: ExecuteTaskInput!\n) {\n  ExecuteTask(input: $input) {\n    id\n    taskId\n    status\n    sessionId\n  }\n}\n"
  }
};
})();

(node as any).hash = "5d6700d6a65f51b001ab718d4ae589df";

export default node;
