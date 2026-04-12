/**
 * @generated SignedSource<<f9b35dd7754b453662cde5f23d03bae1>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type McpOauthConnectionStatus = "connected" | "degraded" | "not_connected" | "%future added value";
export type McpServerAuthType = "custom_headers" | "none" | "oauth" | "%future added value";
export type mcpServersPageQuery$variables = Record<PropertyKey, never>;
export type mcpServersPageQuery$data = {
  readonly McpServers: ReadonlyArray<{
    readonly authType: McpServerAuthType;
    readonly callTimeoutMs: number;
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly enabled: boolean;
    readonly headersText: string;
    readonly id: string;
    readonly name: string;
    readonly oauthClientId: string | null | undefined;
    readonly oauthConnectionStatus: McpOauthConnectionStatus | null | undefined;
    readonly oauthGrantedScopes: ReadonlyArray<string>;
    readonly oauthLastError: string | null | undefined;
    readonly oauthRequestedScopes: ReadonlyArray<string>;
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
        "name": "authType",
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
        "name": "oauthClientId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "oauthConnectionStatus",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "oauthGrantedScopes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "oauthLastError",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "oauthRequestedScopes",
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
    "cacheID": "788f06fa711d400e03196ed356a37ac4",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageQuery",
    "operationKind": "query",
    "text": "query mcpServersPageQuery {\n  McpServers {\n    id\n    name\n    description\n    url\n    authType\n    headersText\n    callTimeoutMs\n    enabled\n    oauthClientId\n    oauthConnectionStatus\n    oauthGrantedScopes\n    oauthLastError\n    oauthRequestedScopes\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "2a89cbffd4da774afdf5d05edd3b8091";

export default node;
