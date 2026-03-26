/**
 * @generated SignedSource<<e9790ad7986a14751bccfbc44c4d0118>>
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
  sessionId?: string | null | undefined;
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
    readonly inferredTitle: string | null | undefined;
    readonly modelId: string;
    readonly reasoningLevel: string;
    readonly status: string;
    readonly updatedAt: string;
    readonly userSetTitle: string | null | undefined;
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
        "name": "inferredTitle",
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
    "cacheID": "8771c490c0daefd1492a8f4ceb063fa8",
    "id": null,
    "metadata": {},
    "name": "chatsPageCreateSessionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageCreateSessionMutation(\n  $input: CreateSessionInput!\n) {\n  CreateSession(input: $input) {\n    id\n    agentId\n    modelId\n    reasoningLevel\n    inferredTitle\n    status\n    createdAt\n    updatedAt\n    userSetTitle\n  }\n}\n"
  }
};
})();

(node as any).hash = "04e827353149c92b39184a43a4b8a712";

export default node;
