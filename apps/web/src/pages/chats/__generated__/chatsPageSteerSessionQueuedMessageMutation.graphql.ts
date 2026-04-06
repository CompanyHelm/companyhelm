/**
 * @generated SignedSource<<93971466f7164dc8880feb91ed5bb0b2>>
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
    readonly claimedAt: string | null | undefined;
    readonly createdAt: string;
    readonly dispatchedAt: string | null | undefined;
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
        "name": "claimedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "dispatchedAt",
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
    "cacheID": "c7525f5a434787e0ba99900c481633a7",
    "id": null,
    "metadata": {},
    "name": "chatsPageSteerSessionQueuedMessageMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageSteerSessionQueuedMessageMutation(\n  $input: SteerSessionQueuedMessageInput!\n) {\n  SteerSessionQueuedMessage(input: $input) {\n    id\n    sessionId\n    text\n    shouldSteer\n    status\n    claimedAt\n    dispatchedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "ca124a58d8edce0cf0758c4113c9b99e";

export default node;
