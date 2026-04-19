/**
 * @generated SignedSource<<08e24a6e380f6401f04787f6b96831f3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type workflowDetailPageQuery$variables = {
  workflowId: string;
};
export type workflowDetailPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Workflow: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly id: string;
    readonly inputs: ReadonlyArray<{
      readonly createdAt: string;
      readonly defaultValue: string | null | undefined;
      readonly description: string | null | undefined;
      readonly id: string;
      readonly isRequired: boolean;
      readonly name: string;
    }>;
    readonly instructions: string | null | undefined;
    readonly isEnabled: boolean;
    readonly name: string;
    readonly steps: ReadonlyArray<{
      readonly createdAt: string;
      readonly id: string;
      readonly instructions: string | null | undefined;
      readonly name: string;
      readonly ordinal: number;
      readonly stepId: string;
    }>;
    readonly updatedAt: string;
  };
  readonly WorkflowRuns: ReadonlyArray<{
    readonly agentId: string;
    readonly completedAt: string | null | undefined;
    readonly createdAt: string;
    readonly id: string;
    readonly sessionId: string;
    readonly startedAt: string | null | undefined;
    readonly status: string;
    readonly steps: ReadonlyArray<{
      readonly id: string;
      readonly instructions: string | null | undefined;
      readonly name: string;
      readonly ordinal: number;
      readonly status: string;
      readonly workflowRunId: string;
    }>;
    readonly updatedAt: string;
    readonly workflowDefinitionId: string | null | undefined;
  }>;
};
export type workflowDetailPageQuery = {
  response: workflowDetailPageQuery$data;
  variables: workflowDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "workflowId"
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
  "name": "instructions",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "ordinal",
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
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v9 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "workflowId"
      }
    ],
    "concreteType": "Workflow",
    "kind": "LinkedField",
    "name": "Workflow",
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
        "name": "isEnabled",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowInput",
        "kind": "LinkedField",
        "name": "inputs",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "isRequired",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "defaultValue",
            "storageKey": null
          },
          (v5/*: any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowStep",
        "kind": "LinkedField",
        "name": "steps",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "stepId",
            "storageKey": null
          },
          (v2/*: any*/),
          (v4/*: any*/),
          (v6/*: any*/),
          (v5/*: any*/)
        ],
        "storageKey": null
      },
      (v5/*: any*/),
      (v7/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "workflowDefinitionId",
        "variableName": "workflowId"
      }
    ],
    "concreteType": "WorkflowRun",
    "kind": "LinkedField",
    "name": "WorkflowRuns",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "workflowDefinitionId",
        "storageKey": null
      },
      (v8/*: any*/),
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
        "name": "sessionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowRunStep",
        "kind": "LinkedField",
        "name": "steps",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "workflowRunId",
            "storageKey": null
          },
          (v2/*: any*/),
          (v4/*: any*/),
          (v6/*: any*/),
          (v8/*: any*/)
        ],
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
        "name": "completedAt",
        "storageKey": null
      },
      (v5/*: any*/),
      (v7/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "workflowDetailPageQuery",
    "selections": (v9/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "workflowDetailPageQuery",
    "selections": (v9/*: any*/)
  },
  "params": {
    "cacheID": "fc11b448337d0d1739c906be7240f586",
    "id": null,
    "metadata": {},
    "name": "workflowDetailPageQuery",
    "operationKind": "query",
    "text": "query workflowDetailPageQuery(\n  $workflowId: ID!\n) {\n  Agents {\n    id\n    name\n  }\n  Workflow(id: $workflowId) {\n    id\n    name\n    description\n    instructions\n    isEnabled\n    inputs {\n      id\n      name\n      description\n      isRequired\n      defaultValue\n      createdAt\n    }\n    steps {\n      id\n      stepId\n      name\n      instructions\n      ordinal\n      createdAt\n    }\n    createdAt\n    updatedAt\n  }\n  WorkflowRuns(workflowDefinitionId: $workflowId) {\n    id\n    workflowDefinitionId\n    status\n    agentId\n    sessionId\n    steps {\n      id\n      workflowRunId\n      name\n      instructions\n      ordinal\n      status\n    }\n    startedAt\n    completedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "d91dfd8d259a8ffb682212bb44b096f6";

export default node;
