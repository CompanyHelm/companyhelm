/**
 * @generated SignedSource<<3f83823b4c5366db6a9b5c3acfab458a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type MarkSessionReadInput = {
  sessionId: string;
};
export type chatsPageMarkSessionReadMutation$variables = {
  input: MarkSessionReadInput;
};
export type chatsPageMarkSessionReadMutation$data = {
  readonly MarkSessionRead: {
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
  };
};
export type chatsPageMarkSessionReadMutation = {
  response: chatsPageMarkSessionReadMutation$data;
  variables: chatsPageMarkSessionReadMutation$variables;
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
    "name": "MarkSessionRead",
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
        "name": "thinkingText",
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
    "name": "chatsPageMarkSessionReadMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageMarkSessionReadMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "1f88bec60c596f5616e1ce684ab25c44",
    "id": null,
    "metadata": {},
    "name": "chatsPageMarkSessionReadMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageMarkSessionReadMutation(\n  $input: MarkSessionReadInput!\n) {\n  MarkSessionRead(input: $input) {\n    id\n    agentId\n    hasUnread\n    currentContextTokens\n    isCompacting\n    maxContextTokens\n    modelProviderCredentialModelId\n    modelId\n    reasoningLevel\n    inferredTitle\n    isThinking\n    status\n    thinkingText\n    createdAt\n    updatedAt\n    userSetTitle\n  }\n}\n"
  }
};
})();

(node as any).hash = "4fd8ffc3d3e3b3697dfa9feb930a4d48";

export default node;
