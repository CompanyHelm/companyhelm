/**
 * @generated SignedSource<<5cb0c62dbff31f261c84ab9b6b411727>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageSessionUpdatedSubscription$variables = Record<PropertyKey, never>;
export type chatsPageSessionUpdatedSubscription$data = {
  readonly SessionUpdated: {
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
export type chatsPageSessionUpdatedSubscription = {
  response: chatsPageSessionUpdatedSubscription$data;
  variables: chatsPageSessionUpdatedSubscription$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Session",
    "kind": "LinkedField",
    "name": "SessionUpdated",
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageSessionUpdatedSubscription",
    "selections": (v0/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageSessionUpdatedSubscription",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "7744289ed002d697f50bbf75fab0735a",
    "id": null,
    "metadata": {},
    "name": "chatsPageSessionUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageSessionUpdatedSubscription {\n  SessionUpdated {\n    id\n    agentId\n    modelId\n    reasoningLevel\n    inferredTitle\n    status\n    createdAt\n    updatedAt\n    userSetTitle\n  }\n}\n"
  }
};
})();

(node as any).hash = "f16ffe273c525e46d2f2df975b091a75";

export default node;
