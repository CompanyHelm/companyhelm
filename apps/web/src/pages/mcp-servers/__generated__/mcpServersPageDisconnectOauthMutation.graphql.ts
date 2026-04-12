/**
 * @generated SignedSource<<482454ac0acd0f97b53a56f722d7a084>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type McpOauthConnectionStatus = "connected" | "degraded" | "not_connected" | "%future added value";
export type McpServerAuthType = "custom_headers" | "none" | "oauth" | "%future added value";
export type DisconnectMcpServerOAuthInput = {
  mcpServerId: string;
};
export type mcpServersPageDisconnectOauthMutation$variables = {
  input: DisconnectMcpServerOAuthInput;
};
export type mcpServersPageDisconnectOauthMutation$data = {
  readonly DisconnectMcpServerOAuth: {
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
  };
};
export type mcpServersPageDisconnectOauthMutation = {
  response: mcpServersPageDisconnectOauthMutation$data;
  variables: mcpServersPageDisconnectOauthMutation$variables;
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
    "concreteType": "McpServer",
    "kind": "LinkedField",
    "name": "DisconnectMcpServerOAuth",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "mcpServersPageDisconnectOauthMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServersPageDisconnectOauthMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b8daf2ea8e1c8c9f0f6c207bd4861cda",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageDisconnectOauthMutation",
    "operationKind": "mutation",
    "text": "mutation mcpServersPageDisconnectOauthMutation(\n  $input: DisconnectMcpServerOAuthInput!\n) {\n  DisconnectMcpServerOAuth(input: $input) {\n    id\n    name\n    description\n    url\n    authType\n    headersText\n    callTimeoutMs\n    enabled\n    oauthClientId\n    oauthConnectionStatus\n    oauthGrantedScopes\n    oauthLastError\n    oauthRequestedScopes\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "832c4a00573501d23610cdc94169e41c";

export default node;
