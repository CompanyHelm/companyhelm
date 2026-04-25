/**
 * @generated SignedSource<<d0ffdf867b2c1cc3b512fb2ec6a5bd01>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataSessionQueuedMessagesUpdatedSubscription$variables = {
  sessionId: string;
};
export type chatsPageDataSessionQueuedMessagesUpdatedSubscription$data = {
  readonly SessionQueuedMessagesUpdated: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly images: ReadonlyArray<{
      readonly base64EncodedImage: string;
      readonly id: string;
      readonly mimeType: string;
    }>;
    readonly principalAgentId: string | null | undefined;
    readonly principalSessionId: string | null | undefined;
    readonly principalType: string;
    readonly sessionId: string;
    readonly shouldSteer: boolean;
    readonly status: string;
    readonly text: string;
    readonly updatedAt: string;
  }>;
};
export type chatsPageDataSessionQueuedMessagesUpdatedSubscription = {
  response: chatsPageDataSessionQueuedMessagesUpdatedSubscription$data;
  variables: chatsPageDataSessionQueuedMessagesUpdatedSubscription$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "sessionId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "sessionId",
        "variableName": "sessionId"
      }
    ],
    "concreteType": "SessionQueuedMessage",
    "kind": "LinkedField",
    "name": "SessionQueuedMessagesUpdated",
    "plural": true,
    "selections": [
      (v1/*: any*/),
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
        "concreteType": "SessionQueuedMessageImage",
        "kind": "LinkedField",
        "name": "images",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "base64EncodedImage",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "mimeType",
            "storageKey": null
          }
        ],
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
        "name": "principalType",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "principalAgentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "principalSessionId",
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
    "name": "chatsPageDataSessionQueuedMessagesUpdatedSubscription",
    "selections": (v2/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataSessionQueuedMessagesUpdatedSubscription",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "938aefd6a08d415909fab20653d861d6",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSessionQueuedMessagesUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageDataSessionQueuedMessagesUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionQueuedMessagesUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    text\n    images {\n      id\n      base64EncodedImage\n      mimeType\n    }\n    shouldSteer\n    status\n    principalType\n    principalAgentId\n    principalSessionId\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "6f80df888b9d47b16fdfe0f847cb6234";

export default node;
