/**
 * @generated SignedSource<<7ae68d80be02e9ab992e6a6b46ea7dcc>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateTaskInput = {
  assignedAgentId?: string | null | undefined;
  assignedUserId?: string | null | undefined;
  description?: string | null | undefined;
  name?: string | null | undefined;
  status?: string | null | undefined;
  taskId: string;
  taskStageId?: string | null | undefined;
};
export type taskDetailPageUpdateTaskMutation$variables = {
  input: UpdateTaskInput;
};
export type taskDetailPageUpdateTaskMutation$data = {
  readonly UpdateTask: {
    readonly assignedAt: string | null | undefined;
    readonly assignee: {
      readonly email: string | null | undefined;
      readonly id: string;
      readonly kind: string;
      readonly name: string;
    } | null | undefined;
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly taskStageId: string;
    readonly taskStageName: string;
    readonly updatedAt: string;
  };
};
export type taskDetailPageUpdateTaskMutation = {
  response: taskDetailPageUpdateTaskMutation$data;
  variables: taskDetailPageUpdateTaskMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v3 = [
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
    "name": "UpdateTask",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/),
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
        "name": "assignedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "TaskAssignee",
        "kind": "LinkedField",
        "name": "assignee",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "kind",
            "storageKey": null
          },
          (v1/*: any*/),
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "email",
            "storageKey": null
          }
        ],
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
    "name": "taskDetailPageUpdateTaskMutation",
    "selections": (v3/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "taskDetailPageUpdateTaskMutation",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "64005fd411f0d76e2371c2d3f718e4b4",
    "id": null,
    "metadata": {},
    "name": "taskDetailPageUpdateTaskMutation",
    "operationKind": "mutation",
    "text": "mutation taskDetailPageUpdateTaskMutation(\n  $input: UpdateTaskInput!\n) {\n  UpdateTask(input: $input) {\n    id\n    name\n    description\n    status\n    taskStageId\n    taskStageName\n    assignedAt\n    assignee {\n      kind\n      id\n      name\n      email\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "048a939b35f3915e98fd2af4049b61ad";

export default node;
