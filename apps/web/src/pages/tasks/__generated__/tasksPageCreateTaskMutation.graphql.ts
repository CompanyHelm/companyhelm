/**
 * @generated SignedSource<<52b8e4e6472f8b398fc7ce634a887785>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateTaskInput = {
  assignedAgentId?: string | null | undefined;
  assignedUserId?: string | null | undefined;
  description?: string | null | undefined;
  name: string;
  status?: string | null | undefined;
  taskStageId?: string | null | undefined;
};
export type tasksPageCreateTaskMutation$variables = {
  input: CreateTaskInput;
};
export type tasksPageCreateTaskMutation$data = {
  readonly CreateTask: {
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
    readonly taskStageId: string | null | undefined;
    readonly taskStageName: string | null | undefined;
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
    "name": "CreateTask",
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
    "name": "tasksPageCreateTaskMutation",
    "selections": (v3/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "tasksPageCreateTaskMutation",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "12e69f487bc19af4c11a020fd6c04c3d",
    "id": null,
    "metadata": {},
    "name": "tasksPageCreateTaskMutation",
    "operationKind": "mutation",
    "text": "mutation tasksPageCreateTaskMutation(\n  $input: CreateTaskInput!\n) {\n  CreateTask(input: $input) {\n    id\n    name\n    description\n    status\n    taskStageId\n    taskStageName\n    assignedAt\n    assignee {\n      kind\n      id\n      name\n      email\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "d8bd55830abbcd96afc2b09553ffb252";

export default node;
