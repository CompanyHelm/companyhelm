/**
 * @generated SignedSource<<5d9b2ebeebb7cd7e49b7db9fa3a794da>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageQuery$variables = Record<PropertyKey, never>;
export type chatsPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly modelName: string | null | undefined;
    readonly modelProvider: string | null | undefined;
    readonly name: string;
    readonly reasoningLevel: string | null | undefined;
  }>;
  readonly Sessions: ReadonlyArray<{
    readonly agentId: string;
    readonly createdAt: string;
    readonly id: string;
    readonly modelId: string;
    readonly reasoningLevel: string;
    readonly updatedAt: string;
    readonly userMessage: string;
  }>;
};
export type chatsPageQuery = {
  response: chatsPageQuery$data;
  variables: chatsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "reasoningLevel",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "name",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProvider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelName",
        "storageKey": null
      },
      (v1/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Session",
    "kind": "LinkedField",
    "name": "Sessions",
    "plural": true,
    "selections": [
      (v0/*: any*/),
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
      (v1/*: any*/),
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "8739ccb3d9469b0dd3291b4c2fef6bcd",
    "id": null,
    "metadata": {},
    "name": "chatsPageQuery",
    "operationKind": "query",
    "text": "query chatsPageQuery {\n  Agents {\n    id\n    name\n    modelProvider\n    modelName\n    reasoningLevel\n  }\n  Sessions {\n    id\n    agentId\n    modelId\n    reasoningLevel\n    userMessage\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "0ee2f342cc902d4e94a1a064a17e9600";

export default node;
