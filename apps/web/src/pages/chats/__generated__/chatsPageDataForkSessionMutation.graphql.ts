/**
 * @generated SignedSource<<222514359b64affc91f827fd1e448e7f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ForkSessionInput = {
  sessionId: string;
};
export type chatsPageDataForkSessionMutation$variables = {
  input: ForkSessionInput;
};
export type chatsPageDataForkSessionMutation$data = {
  readonly ForkSession: {
    readonly agentId: string;
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
export type chatsPageDataForkSessionMutation = {
  response: chatsPageDataForkSessionMutation$data;
  variables: chatsPageDataForkSessionMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "Session",
    "kind": "LinkedField",
    "name": "ForkSession",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
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
        "name": "createdAt",
        "storageKey": null
      },
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageDataForkSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataForkSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "da3e99233b62dcfd3f20c43f6cfd06e9",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataForkSessionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataForkSessionMutation(\n  $input: ForkSessionInput!\n) {\n  ForkSession(input: $input) {\n    id\n    agentId\n    hasUnread\n    currentContextTokens\n    forkedFromSessionAgentId\n    forkedFromSessionId\n    forkedFromSessionTitle\n    forkedFromTurnId\n    isCompacting\n    maxContextTokens\n    modelProviderCredentialModelId\n    modelId\n    modelOptions\n    reasoningLevel\n    inferredTitle\n    isThinking\n    status\n    createdAt\n    updatedAt\n    lastUserMessageAt\n    userSetTitle\n  }\n}\n"
  }
};
})();

(node as any).hash = "77a1add5c9d3b4286a0c9ab96a0215c0";

export default node;
