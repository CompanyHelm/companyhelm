/**
 * @generated SignedSource<<cf8a69e0a8f72c6eafd87bf3201ff87d>>
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
    readonly modelId: string;
    readonly reasoningLevel: string;
    readonly status: string;
    readonly updatedAt: string;
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
    "cacheID": "57b7be799162d69be41094a06ad2cdcd",
    "id": null,
    "metadata": {},
    "name": "chatsPageSessionUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageSessionUpdatedSubscription {\n  SessionUpdated {\n    id\n    agentId\n    modelId\n    reasoningLevel\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "34da47d1b04a70cab142253a378d0c95";

export default node;
