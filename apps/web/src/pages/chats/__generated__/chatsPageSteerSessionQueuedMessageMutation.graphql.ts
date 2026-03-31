/**
 * @generated SignedSource<<641729a0d5896c37fa2efa721092bfa6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SteerSessionQueuedMessageInput = {
  id: string;
};
export type chatsPageSteerSessionQueuedMessageMutation$variables = {
  input: SteerSessionQueuedMessageInput;
};
export type chatsPageSteerSessionQueuedMessageMutation$data = {
  readonly SteerSessionQueuedMessage: {
    readonly createdAt: string;
    readonly id: string;
    readonly sessionId: string;
    readonly shouldSteer: boolean;
    readonly status: string;
    readonly text: string;
    readonly updatedAt: string;
  };
};
export type chatsPageSteerSessionQueuedMessageMutation = {
  response: chatsPageSteerSessionQueuedMessageMutation$data;
  variables: chatsPageSteerSessionQueuedMessageMutation$variables;
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
    "concreteType": "SessionQueuedMessage",
    "kind": "LinkedField",
    "name": "SteerSessionQueuedMessage",
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
        "name": "sessionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "text",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "shouldSteer",
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
    "name": "chatsPageSteerSessionQueuedMessageMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageSteerSessionQueuedMessageMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c568b3c83808e16b69e0767fb547c55d",
    "id": null,
    "metadata": {},
    "name": "chatsPageSteerSessionQueuedMessageMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageSteerSessionQueuedMessageMutation(\n  $input: SteerSessionQueuedMessageInput!\n) {\n  SteerSessionQueuedMessage(input: $input) {\n    id\n    sessionId\n    text\n    shouldSteer\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "d0f8c50e43c358743ec9ab32f4d966bd";

export default node;
