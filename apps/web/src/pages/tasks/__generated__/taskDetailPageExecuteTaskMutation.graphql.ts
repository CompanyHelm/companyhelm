/**
 * @generated SignedSource<<e338c7b9e608b93b161b67a56c0537e4>>
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
export type taskDetailPageExecuteTaskMutation$variables = {
  input: ExecuteTaskInput;
};
export type taskDetailPageExecuteTaskMutation$data = {
  readonly ExecuteTask: {
    readonly agentId: string;
    readonly agentName: string;
    readonly createdAt: string;
    readonly endedReason: string | null | undefined;
    readonly finishedAt: string | null | undefined;
    readonly id: string;
    readonly lastActivityAt: string;
    readonly sessionId: string | null | undefined;
    readonly startedAt: string | null | undefined;
    readonly status: string;
    readonly taskId: string;
    readonly updatedAt: string;
  };
};
export type taskDetailPageExecuteTaskMutation = {
  response: taskDetailPageExecuteTaskMutation$data;
  variables: taskDetailPageExecuteTaskMutation$variables;
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
        "name": "agentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "agentName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sessionId",
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
        "name": "startedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "finishedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastActivityAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "endedReason",
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
    "name": "taskDetailPageExecuteTaskMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "taskDetailPageExecuteTaskMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "a4debc63ad5a2eba02532ab73fc01da7",
    "id": null,
    "metadata": {},
    "name": "taskDetailPageExecuteTaskMutation",
    "operationKind": "mutation",
    "text": "mutation taskDetailPageExecuteTaskMutation(\n  $input: ExecuteTaskInput!\n) {\n  ExecuteTask(input: $input) {\n    id\n    taskId\n    agentId\n    agentName\n    sessionId\n    status\n    startedAt\n    finishedAt\n    lastActivityAt\n    endedReason\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "18b0b903e99893dd9403964f42fbd3f5";

export default node;
