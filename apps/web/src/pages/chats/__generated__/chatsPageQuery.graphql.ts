/**
 * @generated SignedSource<<c6fc959e7088d532047e7dd208317889>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageQuery$variables = Record<PropertyKey, never>;
export type chatsPageQuery$data = {
  readonly AgentCreateOptions: ReadonlyArray<{
    readonly defaultModelId: string | null | undefined;
    readonly defaultReasoningLevel: string | null | undefined;
    readonly id: string;
    readonly label: string;
    readonly modelProvider: string;
    readonly models: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly modelId: string;
      readonly name: string;
      readonly reasoningLevels: ReadonlyArray<string>;
    }>;
  }>;
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly modelName: string | null | undefined;
    readonly modelProvider: string | null | undefined;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly modelProviderCredentialModelId: string | null | undefined;
    readonly name: string;
    readonly reasoningLevel: string | null | undefined;
  }>;
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
  readonly Sessions: ReadonlyArray<{
    readonly agentId: string;
    readonly createdAt: string;
    readonly currentContextTokens: number | null | undefined;
    readonly hasUnread: boolean;
    readonly id: string;
    readonly inferredTitle: string | null | undefined;
    readonly isCompacting: boolean;
    readonly isThinking: boolean;
    readonly maxContextTokens: number | null | undefined;
    readonly modelId: string;
    readonly modelProviderCredentialModelId: string | null | undefined;
    readonly reasoningLevel: string;
    readonly status: string;
    readonly thinkingText: string | null | undefined;
    readonly updatedAt: string;
    readonly userSetTitle: string | null | undefined;
  }>;
};
export type chatsPageQuery = {
  response: chatsPageQuery$data;
  variables: chatsPageQuery$variables;
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
  "name": "modelProviderCredentialModelId",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "reasoningLevel",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelId",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v7 = [
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
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProviderCredentialId",
        "storageKey": null
      },
      (v2/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelName",
        "storageKey": null
      },
      (v4/*: any*/)
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
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "label",
        "storageKey": null
      },
      (v3/*: any*/),
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
          (v5/*: any*/),
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
      (v6/*: any*/),
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
      (v5/*: any*/),
      (v4/*: any*/),
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
        "name": "thinkingText",
        "storageKey": null
      },
      (v6/*: any*/),
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
    "name": "chatsPageQuery",
    "selections": (v7/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageQuery",
    "selections": (v7/*: any*/)
  },
  "params": {
    "cacheID": "437834a9582b65d2226c7e0749848e53",
    "id": null,
    "metadata": {},
    "name": "chatsPageQuery",
    "operationKind": "query",
    "text": "query chatsPageQuery {\n  Agents {\n    id\n    name\n    modelProviderCredentialId\n    modelProviderCredentialModelId\n    modelProvider\n    modelName\n    reasoningLevel\n  }\n  AgentCreateOptions {\n    id\n    label\n    modelProvider\n    defaultModelId\n    defaultReasoningLevel\n    models {\n      id\n      modelId\n      name\n      description\n      reasoningLevels\n    }\n  }\n  InboxHumanQuestions {\n    id\n    sessionId\n    title\n    questionText\n    allowCustomAnswer\n    createdAt\n    proposals {\n      id\n      answerText\n      rating\n    }\n  }\n  Sessions {\n    id\n    agentId\n    hasUnread\n    currentContextTokens\n    isCompacting\n    maxContextTokens\n    modelProviderCredentialModelId\n    modelId\n    reasoningLevel\n    inferredTitle\n    isThinking\n    status\n    thinkingText\n    createdAt\n    updatedAt\n    userSetTitle\n  }\n}\n"
  }
};
})();

(node as any).hash = "86d8dd469fde2f38de7143ef6b3cfd76";

export default node;
