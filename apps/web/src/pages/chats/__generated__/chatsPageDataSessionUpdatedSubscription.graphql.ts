/**
 * @generated SignedSource<<8312f04cbcf14fa221db01dc37bf538d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataSessionUpdatedSubscription$variables = Record<PropertyKey, never>;
export type chatsPageDataSessionUpdatedSubscription$data = {
  readonly SessionUpdated: {
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
    readonly canForkLatestSession: boolean;
    readonly createdAt: string;
    readonly currentContextTokens: number | null | undefined;
    readonly forkedFromSessionAgentId: string | null | undefined;
    readonly forkedFromSessionId: string | null | undefined;
    readonly forkedFromSessionTitle: string | null | undefined;
    readonly forkedFromTurnId: string | null | undefined;
    readonly hasUnread: boolean;
    readonly id: string;
    readonly inferredTitle: string | null | undefined;
    readonly isCompacting: boolean;
    readonly isThinking: boolean;
    readonly lastUserMessageAt: string | null | undefined;
    readonly maxContextTokens: number | null | undefined;
    readonly modelId: string;
    readonly modelOptions: any;
    readonly modelProviderCredentialModelId: string | null | undefined;
    readonly reasoningLevel: string;
    readonly status: string;
    readonly updatedAt: string;
    readonly userSetTitle: string | null | undefined;
  };
};
export type chatsPageDataSessionUpdatedSubscription = {
  response: chatsPageDataSessionUpdatedSubscription$data;
  variables: chatsPageDataSessionUpdatedSubscription$variables;
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
  "name": "status",
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Session",
    "kind": "LinkedField",
    "name": "SessionUpdated",
    "plural": false,
    "selections": [
      (v0/*: any*/),
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
        "concreteType": "SessionAssociatedTask",
        "kind": "LinkedField",
        "name": "associatedTask",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/)
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
          (v0/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "workflowDefinitionId",
            "storageKey": null
          },
          (v1/*: any*/),
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "WorkflowRunStep",
            "kind": "LinkedField",
            "name": "steps",
            "plural": true,
            "selections": [
              (v0/*: any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "workflowRunId",
                "storageKey": null
              },
              (v1/*: any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "ordinal",
                "storageKey": null
              },
              (v2/*: any*/)
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
        "name": "hasUnread",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "inferredTitle",
        "storageKey": null
      },
      (v2/*: any*/),
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
        "name": "lastUserMessageAt",
        "storageKey": null
      },
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
        "name": "currentContextTokens",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isCompacting",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isThinking",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "maxContextTokens",
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
        "name": "canForkLatestSession",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProviderCredentialModelId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelOptions",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningLevel",
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageDataSessionUpdatedSubscription",
    "selections": (v3/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageDataSessionUpdatedSubscription",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "738b0e6ca598e4b1a49cca0071c205e5",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSessionUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageDataSessionUpdatedSubscription {\n  SessionUpdated {\n    id\n    agentId\n    associatedTask {\n      id\n      name\n      status\n    }\n    associatedWorkflowRun {\n      id\n      workflowDefinitionId\n      name\n      status\n      steps {\n        id\n        workflowRunId\n        name\n        ordinal\n        status\n      }\n    }\n    hasUnread\n    inferredTitle\n    status\n    createdAt\n    lastUserMessageAt\n    userSetTitle\n    currentContextTokens\n    isCompacting\n    isThinking\n    maxContextTokens\n    forkedFromSessionAgentId\n    forkedFromSessionId\n    forkedFromSessionTitle\n    forkedFromTurnId\n    canForkLatestSession\n    modelProviderCredentialModelId\n    modelId\n    modelOptions\n    reasoningLevel\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "43515ab3a7643f1c53d0ea3f4efa04b0";

export default node;
