/**
 * @generated SignedSource<<e752a2c37edd960a538d24b9529efd4b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type tasksPageQuery$variables = Record<PropertyKey, never>;
export type tasksPageQuery$data = {
  readonly TaskCategories: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly name: string;
    readonly taskCount: number;
    readonly updatedAt: string;
  }>;
  readonly Tasks: ReadonlyArray<{
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly taskCategoryId: string | null | undefined;
    readonly taskCategoryName: string | null | undefined;
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
  "name": "createdAt",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v4 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "TaskCategory",
    "kind": "LinkedField",
    "name": "TaskCategories",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "taskCount",
        "storageKey": null
      },
      (v2/*: any*/),
      (v3/*: any*/)
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
      (v2/*: any*/),
      (v3/*: any*/)
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
    "selections": (v4/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "tasksPageQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "18c1f6d953358a4b5b6fdc4126cb4d59",
    "id": null,
    "metadata": {},
    "name": "tasksPageQuery",
    "operationKind": "query",
    "text": "query tasksPageQuery {\n  TaskCategories {\n    id\n    name\n    taskCount\n    createdAt\n    updatedAt\n  }\n  Tasks {\n    id\n    name\n    description\n    status\n    taskCategoryId\n    taskCategoryName\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "c265c485eb93eb6a29ce888e1d078119";

export default node;
