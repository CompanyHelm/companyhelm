/**
 * @generated SignedSource<<928dfb0e3acd09a1e20d3c4589dd3757>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type mcpServersPageQuery$variables = Record<PropertyKey, never>;
export type mcpServersPageQuery$data = {
  readonly McpServers: ReadonlyArray<{
    readonly callTimeoutMs: number;
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly enabled: boolean;
    readonly headersText: string;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
    readonly url: string;
  }>;
};
export type mcpServersPageQuery = {
  response: mcpServersPageQuery$data;
  variables: mcpServersPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "McpServer",
    "kind": "LinkedField",
    "name": "McpServers",
    "plural": true,
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
        "name": "name",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "url",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "headersText",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "callTimeoutMs",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "enabled",
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
    "name": "mcpServersPageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "mcpServersPageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "472858bc17a983ef96e3fa39d81e800c",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageQuery",
    "operationKind": "query",
    "text": "query mcpServersPageQuery {\n  McpServers {\n    id\n    name\n    description\n    url\n    headersText\n    callTimeoutMs\n    enabled\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "c163da70628bb2e4ec59ad70f0dd6e6f";

export default node;
