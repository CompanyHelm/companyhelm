/**
 * @generated SignedSource<<bfeddf93a2437f856a271942680d8a6c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type PromptSessionInput = {
  id: string;
  shouldSteer?: boolean | null | undefined;
  userMessage: string;
};
export type chatsPagePromptSessionMutation$variables = {
  input: PromptSessionInput;
};
export type chatsPagePromptSessionMutation$data = {
  readonly PromptSession: {
    readonly agentId: string;
    readonly createdAt: string;
    readonly id: string;
    readonly inferredTitle: string | null | undefined;
    readonly isThinking: boolean;
    readonly modelId: string;
    readonly reasoningLevel: string;
    readonly status: string;
    readonly thinkingText: string | null | undefined;
    readonly updatedAt: string;
    readonly userSetTitle: string | null | undefined;
  };
};
export type chatsPagePromptSessionMutation = {
  response: chatsPagePromptSessionMutation$data;
  variables: chatsPagePromptSessionMutation$variables;
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
    "name": "PromptSession",
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
    "name": "chatsPagePromptSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPagePromptSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "334303b139de38128e7b85f5628e080d",
    "id": null,
    "metadata": {},
    "name": "chatsPagePromptSessionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPagePromptSessionMutation(\n  $input: PromptSessionInput!\n) {\n  PromptSession(input: $input) {\n    id\n    agentId\n    modelId\n    reasoningLevel\n    inferredTitle\n    isThinking\n    status\n    thinkingText\n    createdAt\n    updatedAt\n    userSetTitle\n  }\n}\n"
  }
};
})();

(node as any).hash = "5cea7d8bb6aac42981a982d3496eda33";

export default node;
