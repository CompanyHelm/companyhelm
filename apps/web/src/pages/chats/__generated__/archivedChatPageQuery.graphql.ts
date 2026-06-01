/**
 * @generated SignedSource<<d3fede4ad3fc80c06b89ab857cac4948>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type archivedChatPageQuery$variables = {
  sessionId: string;
};
export type archivedChatPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly title: string | null | undefined;
  }>;
  readonly ArchivedSession: {
    readonly agentId: string;
    readonly associatedTask: {
      readonly id: string;
      readonly name: string;
      readonly status: string;
    } | null | undefined;
    readonly associatedWorkflowRun: {
      readonly id: string;
      readonly name: string;
      readonly status: string;
      readonly steps: ReadonlyArray<{
        readonly id: string;
        readonly name: string;
        readonly ordinal: number;
        readonly status: string;
        readonly workflowRunId: string;
      }>;
      readonly workflowDefinitionId: string;
    } | null | undefined;
    readonly forkedFromSessionAgentId: string | null | undefined;
    readonly forkedFromSessionId: string | null | undefined;
    readonly forkedFromSessionTitle: string | null | undefined;
    readonly forkedFromTurnId: string | null | undefined;
    readonly id: string;
    readonly inferredTitle: string | null | undefined;
    readonly isCompacting: boolean;
    readonly status: string;
    readonly updatedAt: string;
    readonly userSetTitle: string | null | undefined;
  };
};
export type archivedChatPageQuery = {
  response: archivedChatPageQuery$data;
  variables: archivedChatPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "sessionId"
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
  "name": "status",
  "storageKey": null
},
v4 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "sessionId",
        "variableName": "sessionId"
      }
    ],
    "concreteType": "Session",
    "kind": "LinkedField",
    "name": "ArchivedSession",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "SessionAssociatedTask",
        "kind": "LinkedField",
        "name": "associatedTask",
        "plural": false,
        "selections": [
          (v1/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "SessionAssociatedWorkflowRun",
        "kind": "LinkedField",
        "name": "associatedWorkflowRun",
        "plural": false,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "workflowDefinitionId",
            "storageKey": null
          },
          (v2/*: any*/),
          (v3/*: any*/),
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
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "ordinal",
                "storageKey": null
              },
              (v3/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "forkedFromSessionAgentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "forkedFromSessionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "forkedFromSessionTitle",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "forkedFromTurnId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "inferredTitle",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isCompacting",
        "storageKey": null
      },
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "userSetTitle",
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
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "title",
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
    "name": "archivedChatPageQuery",
    "selections": (v4/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "archivedChatPageQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "5f92a72d61e768a8063e7450583c5678",
    "id": null,
    "metadata": {},
    "name": "archivedChatPageQuery",
    "operationKind": "query",
    "text": "query archivedChatPageQuery(\n  $sessionId: ID!\n) {\n  ArchivedSession(sessionId: $sessionId) {\n    id\n    associatedTask {\n      id\n      name\n      status\n    }\n    associatedWorkflowRun {\n      id\n      workflowDefinitionId\n      name\n      status\n      steps {\n        id\n        workflowRunId\n        name\n        ordinal\n        status\n      }\n    }\n    forkedFromSessionAgentId\n    forkedFromSessionId\n    forkedFromSessionTitle\n    forkedFromTurnId\n    inferredTitle\n    isCompacting\n    status\n    userSetTitle\n    agentId\n    updatedAt\n  }\n  Agents {\n    id\n    name\n    title\n  }\n}\n"
  }
};
})();

(node as any).hash = "4180b192557b219e8eda4fedd7581638";

export default node;
