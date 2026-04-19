/**
 * @generated SignedSource<<9fc9018cf9f7099f780ba17a01eb23ca>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type workflowRunPageQuery$variables = {
  runId: string;
  workflowId: string;
};
export type workflowRunPageQuery$data = {
  readonly Workflow: {
    readonly description: string | null | undefined;
    readonly id: string;
    readonly name: string;
  };
  readonly WorkflowRun: {
    readonly agentId: string;
    readonly completedAt: string | null | undefined;
    readonly createdAt: string;
    readonly id: string;
    readonly instructions: string | null | undefined;
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
  };
};
export type workflowRunPageQuery = {
  response: workflowRunPageQuery$data;
  variables: workflowRunPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "runId"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "workflowId"
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
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
  "name": "status",
  "storageKey": null
},
v6 = [
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
      (v2/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "runId"
      }
    ],
    "concreteType": "WorkflowRun",
    "kind": "LinkedField",
    "name": "WorkflowRun",
    "plural": false,
    "selections": [
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "workflowDefinitionId",
        "storageKey": null
      },
      (v4/*: any*/),
      (v5/*: any*/),
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
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "workflowRunId",
            "storageKey": null
          },
          (v3/*: any*/),
          (v4/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "ordinal",
            "storageKey": null
          },
          (v5/*: any*/)
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
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "workflowRunPageQuery",
    "selections": (v6/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "workflowRunPageQuery",
    "selections": (v6/*: any*/)
  },
  "params": {
    "cacheID": "60c866fb8b654cf20b7e5038f7588b62",
    "id": null,
    "metadata": {},
    "name": "workflowRunPageQuery",
    "operationKind": "query",
    "text": "query workflowRunPageQuery(\n  $workflowId: ID!\n  $runId: ID!\n) {\n  Workflow(id: $workflowId) {\n    id\n    name\n    description\n  }\n  WorkflowRun(id: $runId) {\n    id\n    workflowDefinitionId\n    instructions\n    status\n    agentId\n    sessionId\n    steps {\n      id\n      workflowRunId\n      name\n      instructions\n      ordinal\n      status\n    }\n    startedAt\n    completedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "95651c9f372351eb70c541c7aedae114";

export default node;
