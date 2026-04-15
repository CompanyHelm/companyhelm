/**
 * @generated SignedSource<<bf57c740ea8da5d293e2bc80c0ae35e3>>
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
  readonly Artifacts: ReadonlyArray<{
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly markdownContent: string | null | undefined;
    readonly name: string;
    readonly pullRequestNumber: number | null | undefined;
    readonly pullRequestProvider: string | null | undefined;
    readonly pullRequestRepository: string | null | undefined;
    readonly state: string;
    readonly type: string;
    readonly updatedAt: string;
    readonly url: string | null | undefined;
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
    readonly taskStageId: string | null | undefined;
    readonly taskStageName: string | null | undefined;
    readonly updatedAt: string;
  };
  readonly TaskAssignableUsers: ReadonlyArray<{
    readonly displayName: string;
    readonly email: string;
    readonly id: string;
  }>;
  readonly TaskRuns: ReadonlyArray<{
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
  }>;
  readonly TaskStages: ReadonlyArray<{
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
  "name": "description",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "email",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v8 = {
  "kind": "Variable",
  "name": "taskId",
  "variableName": "taskId"
},
v9 = [
  (v1/*: any*/),
  (v2/*: any*/)
],
v10 = [
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
      (v3/*: any*/),
      (v4/*: any*/),
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
          (v5/*: any*/)
        ],
        "storageKey": null
      },
      (v6/*: any*/),
      (v7/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      (v8/*: any*/)
    ],
    "concreteType": "TaskRun",
    "kind": "LinkedField",
    "name": "TaskRuns",
    "plural": true,
    "selections": [
      (v1/*: any*/),
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
      (v4/*: any*/),
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
      (v6/*: any*/),
      (v7/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "fields": [
          {
            "kind": "Literal",
            "name": "scopeType",
            "value": "task"
          },
          (v8/*: any*/)
        ],
        "kind": "ObjectValue",
        "name": "input"
      }
    ],
    "concreteType": "Artifact",
    "kind": "LinkedField",
    "name": "Artifacts",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "state",
        "storageKey": null
      },
      (v2/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "markdownContent",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "url",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestProvider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestRepository",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "pullRequestNumber",
        "storageKey": null
      },
      (v6/*: any*/),
      (v7/*: any*/)
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
    "selections": (v9/*: any*/),
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
      (v5/*: any*/)
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
    "selections": (v9/*: any*/),
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "taskDetailPageQuery",
    "selections": (v10/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "taskDetailPageQuery",
    "selections": (v10/*: any*/)
  },
  "params": {
    "cacheID": "eaa3787635d9587afb26e40cc2b20e7b",
    "id": null,
    "metadata": {},
    "name": "taskDetailPageQuery",
    "operationKind": "query",
    "text": "query taskDetailPageQuery(\n  $taskId: ID!\n) {\n  Task(id: $taskId) {\n    id\n    name\n    description\n    status\n    taskStageId\n    taskStageName\n    assignedAt\n    assignee {\n      kind\n      id\n      name\n      email\n    }\n    createdAt\n    updatedAt\n  }\n  TaskRuns(taskId: $taskId) {\n    id\n    taskId\n    agentId\n    agentName\n    sessionId\n    status\n    startedAt\n    finishedAt\n    lastActivityAt\n    endedReason\n    createdAt\n    updatedAt\n  }\n  Artifacts(input: {scopeType: \"task\", taskId: $taskId}) {\n    id\n    type\n    state\n    name\n    description\n    markdownContent\n    url\n    pullRequestProvider\n    pullRequestRepository\n    pullRequestNumber\n    createdAt\n    updatedAt\n  }\n  Agents {\n    id\n    name\n  }\n  TaskAssignableUsers {\n    id\n    displayName\n    email\n  }\n  TaskStages {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "5a904678b4721a5c55b393e79108b520";

export default node;
