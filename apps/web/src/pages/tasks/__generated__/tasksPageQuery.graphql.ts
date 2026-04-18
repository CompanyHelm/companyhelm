/**
 * @generated SignedSource<<e513515fc7c4955d6081ce5601dc54d5>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type tasksPageQuery$variables = Record<PropertyKey, never>;
export type tasksPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly TaskAssignableUsers: ReadonlyArray<{
    readonly displayName: string;
    readonly email: string;
    readonly id: string;
  }>;
  readonly TaskStages: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly taskCount: number;
    readonly updatedAt: string;
  }>;
  readonly Tasks: ReadonlyArray<{
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
  }>;
};
export type tasksPageQuery = {
  response: tasksPageQuery$data;
  variables: tasksPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "email",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v5 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
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
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "displayName",
        "storageKey": null
      },
      (v2/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "TaskStage",
    "kind": "LinkedField",
    "name": "TaskStages",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
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
      (v3/*: any*/),
      (v4/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Task",
    "kind": "LinkedField",
    "name": "Tasks",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
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
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/)
        ],
        "storageKey": null
      },
      (v3/*: any*/),
      (v4/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "tasksPageQuery",
    "selections": (v5/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "tasksPageQuery",
    "selections": (v5/*: any*/)
  },
  "params": {
    "cacheID": "0e0906c22acf189a56d84e34a9c7ede9",
    "id": null,
    "metadata": {},
    "name": "tasksPageQuery",
    "operationKind": "query",
    "text": "query tasksPageQuery {\n  Agents {\n    id\n    name\n  }\n  TaskAssignableUsers {\n    id\n    displayName\n    email\n  }\n  TaskStages {\n    id\n    name\n    isDefault\n    taskCount\n    createdAt\n    updatedAt\n  }\n  Tasks {\n    id\n    name\n    description\n    status\n    taskStageId\n    taskStageName\n    assignedAt\n    assignee {\n      kind\n      id\n      name\n      email\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "d7cffcf3877d4df3056cb570b245f872";

export default node;
