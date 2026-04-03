/**
 * @generated SignedSource<<7b8102fcdeb75f1c1d7d457f365e12f5>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type taskDetailPageQuery$variables = {
  taskId: string;
};
export type taskDetailPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Task: {
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
    readonly taskCategoryId: string | null | undefined;
    readonly taskCategoryName: string | null | undefined;
    readonly updatedAt: string;
  };
  readonly TaskAssignableUsers: ReadonlyArray<{
    readonly displayName: string;
    readonly email: string;
    readonly id: string;
  }>;
  readonly TaskCategories: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
};
export type taskDetailPageQuery = {
  response: taskDetailPageQuery$data;
  variables: taskDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "taskId"
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
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "email",
  "storageKey": null
},
v4 = [
  (v1/*: any*/),
  (v2/*: any*/)
],
v5 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "taskId"
      }
    ],
    "concreteType": "Task",
    "kind": "LinkedField",
    "name": "Task",
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
          (v3/*: any*/)
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
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": (v4/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "TaskAssignableUser",
    "kind": "LinkedField",
    "name": "TaskAssignableUsers",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "displayName",
        "storageKey": null
      },
      (v3/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "TaskCategory",
    "kind": "LinkedField",
    "name": "TaskCategories",
    "plural": true,
    "selections": (v4/*: any*/),
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "taskDetailPageQuery",
    "selections": (v5/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "taskDetailPageQuery",
    "selections": (v5/*: any*/)
  },
  "params": {
    "cacheID": "b6c51f78df529df1ec077887b8b46d46",
    "id": null,
    "metadata": {},
    "name": "taskDetailPageQuery",
    "operationKind": "query",
    "text": "query taskDetailPageQuery(\n  $taskId: ID!\n) {\n  Task(id: $taskId) {\n    id\n    name\n    description\n    status\n    taskCategoryId\n    taskCategoryName\n    assignedAt\n    assignee {\n      kind\n      id\n      name\n      email\n    }\n    createdAt\n    updatedAt\n  }\n  Agents {\n    id\n    name\n  }\n  TaskAssignableUsers {\n    id\n    displayName\n    email\n  }\n  TaskCategories {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "044a4b673630d2c6a05051448d15b3e1";

export default node;
