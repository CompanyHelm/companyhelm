/**
 * @generated SignedSource<<82f9f87c3f15858024becf40f77838e8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "pro" | "%future added value";
export type chatsPageDataQuery$variables = Record<PropertyKey, never>;
export type chatsPageDataQuery$data = {
  readonly AgentCreateOptions: ReadonlyArray<{
    readonly defaultModelId: string | null | undefined;
    readonly defaultReasoningLevel: string | null | undefined;
    readonly id: string;
    readonly label: string;
    readonly modelCredentialSource: string;
    readonly modelProvider: string;
    readonly models: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly modelCredentialSource: string;
      readonly modelId: string;
      readonly modelProviderCredentialModelId: string | null | undefined;
      readonly name: string;
      readonly platformModelId: string | null | undefined;
      readonly reasoningLevels: ReadonlyArray<string>;
      readonly reasoningSupported: boolean;
    }>;
  }>;
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly modelName: string | null | undefined;
    readonly modelProvider: string | null | undefined;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly modelProviderCredentialModelId: string | null | undefined;
    readonly name: string;
    readonly platformModelId: string | null | undefined;
    readonly reasoningLevel: string | null | undefined;
  }>;
  readonly BillingPlans: ReadonlyArray<{
    readonly key: CompanySubscriptionPlan;
    readonly name: string;
  }>;
  readonly CompanyWallet: {
    readonly currentPlan: CompanySubscriptionPlan;
  };
  readonly InboxHumanQuestions: ReadonlyArray<{
    readonly allowCustomAnswer: boolean;
    readonly createdAt: string;
    readonly id: string;
    readonly proposals: ReadonlyArray<{
      readonly answerText: string;
      readonly id: string;
      readonly rating: number;
    }>;
    readonly questionText: string;
    readonly sessionId: string;
    readonly title: string;
  }>;
  readonly ModelProviders: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Sessions: ReadonlyArray<{
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
    readonly modelProviderCredentialModelId: string | null | undefined;
    readonly platformModelId: string | null | undefined;
    readonly reasoningLevel: string;
    readonly status: string;
    readonly thinkingText: string | null | undefined;
    readonly updatedAt: string;
    readonly userSetTitle: string | null | undefined;
  }>;
};
export type chatsPageDataQuery = {
  response: chatsPageDataQuery$data;
  variables: chatsPageDataQuery$variables;
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
  "name": "platformModelId",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialModelId",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "reasoningLevel",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelCredentialSource",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelId",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v10 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProviderCredentialId",
        "storageKey": null
      },
      (v3/*: any*/),
      (v4/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelName",
        "storageKey": null
      },
      (v5/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "AgentCreateProviderOption",
    "kind": "LinkedField",
    "name": "AgentCreateOptions",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v6/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "label",
        "storageKey": null
      },
      (v4/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultModelId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultReasoningLevel",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AgentCreateModelOption",
        "kind": "LinkedField",
        "name": "models",
        "plural": true,
        "selections": [
          (v0/*: any*/),
          (v6/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/),
          (v7/*: any*/),
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
            "name": "reasoningSupported",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "reasoningLevels",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "BillingPlan",
    "kind": "LinkedField",
    "name": "BillingPlans",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "key",
        "storageKey": null
      },
      (v1/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "CompanyWallet",
    "kind": "LinkedField",
    "name": "CompanyWallet",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "currentPlan",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProvider",
    "kind": "LinkedField",
    "name": "ModelProviders",
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
    "concreteType": "InboxHumanQuestion",
    "kind": "LinkedField",
    "name": "InboxHumanQuestions",
    "plural": true,
    "selections": [
      (v0/*: any*/),
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
        "kind": "ScalarField",
        "name": "title",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "questionText",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "allowCustomAnswer",
        "storageKey": null
      },
      (v8/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "InboxHumanQuestionProposal",
        "kind": "LinkedField",
        "name": "proposals",
        "plural": true,
        "selections": [
          (v0/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "answerText",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "rating",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Session",
    "kind": "LinkedField",
    "name": "Sessions",
    "plural": true,
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
          (v9/*: any*/)
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
          (v9/*: any*/),
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
              (v9/*: any*/)
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
        "name": "currentContextTokens",
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
        "name": "isCompacting",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "maxContextTokens",
        "storageKey": null
      },
      (v2/*: any*/),
      (v3/*: any*/),
      (v7/*: any*/),
      (v5/*: any*/),
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
        "name": "isThinking",
        "storageKey": null
      },
      (v9/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "thinkingText",
        "storageKey": null
      },
      (v8/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
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
    "name": "chatsPageDataQuery",
    "selections": (v10/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageDataQuery",
    "selections": (v10/*: any*/)
  },
  "params": {
    "cacheID": "cf831ad157f9233909ca44fe5292ebb0",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataQuery",
    "operationKind": "query",
    "text": "query chatsPageDataQuery {\n  Agents {\n    id\n    name\n    platformModelId\n    modelProviderCredentialId\n    modelProviderCredentialModelId\n    modelProvider\n    modelName\n    reasoningLevel\n  }\n  AgentCreateOptions {\n    id\n    modelCredentialSource\n    label\n    modelProvider\n    defaultModelId\n    defaultReasoningLevel\n    models {\n      id\n      modelCredentialSource\n      platformModelId\n      modelProviderCredentialModelId\n      modelId\n      name\n      description\n      reasoningSupported\n      reasoningLevels\n    }\n  }\n  BillingPlans {\n    key\n    name\n  }\n  CompanyWallet {\n    currentPlan\n  }\n  ModelProviders {\n    id\n    name\n  }\n  InboxHumanQuestions {\n    id\n    sessionId\n    title\n    questionText\n    allowCustomAnswer\n    createdAt\n    proposals {\n      id\n      answerText\n      rating\n    }\n  }\n  Sessions {\n    id\n    agentId\n    associatedTask {\n      id\n      name\n      status\n    }\n    associatedWorkflowRun {\n      id\n      workflowDefinitionId\n      name\n      status\n      steps {\n        id\n        workflowRunId\n        name\n        ordinal\n        status\n      }\n    }\n    hasUnread\n    currentContextTokens\n    forkedFromSessionAgentId\n    forkedFromSessionId\n    forkedFromSessionTitle\n    forkedFromTurnId\n    isCompacting\n    maxContextTokens\n    platformModelId\n    modelProviderCredentialModelId\n    modelId\n    reasoningLevel\n    inferredTitle\n    isThinking\n    status\n    thinkingText\n    createdAt\n    updatedAt\n    lastUserMessageAt\n    userSetTitle\n  }\n}\n"
  }
};
})();

(node as any).hash = "5e1c38ce77c45b83e913d1f94e9581cb";

export default node;
