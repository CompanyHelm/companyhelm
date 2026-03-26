/**
 * @generated SignedSource<<da2bf1a8e181089ea62a5fa5302920ff>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateSessionInput = {
  agentId: string;
  modelId?: string | null | undefined;
  reasoningLevel?: string | null | undefined;
  userMessage: string;
};
export type chatsPageCreateSessionMutation$variables = {
  input: CreateSessionInput;
};
export type chatsPageCreateSessionMutation$data = {
  readonly CreateSession: {
    readonly agentId: string;
    readonly createdAt: string;
    readonly id: string;
    readonly modelId: string;
    readonly reasoningLevel: string;
    readonly updatedAt: string;
    readonly userMessage: string;
  };
};
export type chatsPageCreateSessionMutation = {
  response: chatsPageCreateSessionMutation$data;
  variables: chatsPageCreateSessionMutation$variables;
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
    "name": "CreateSession",
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
        "name": "userMessage",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageCreateSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageCreateSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "53c38ebc76fec0be0b8a88da57e5b2d2",
    "id": null,
    "metadata": {},
    "name": "chatsPageCreateSessionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageCreateSessionMutation(\n  $input: CreateSessionInput!\n) {\n  CreateSession(input: $input) {\n    id\n    agentId\n    modelId\n    reasoningLevel\n    userMessage\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "5dbcf5d79fe8e31bce86beaf3619094a";

export default node;
