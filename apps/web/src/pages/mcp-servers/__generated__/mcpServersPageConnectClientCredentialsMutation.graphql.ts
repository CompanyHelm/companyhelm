/**
 * @generated SignedSource<<eea57b9b06f562ad4813904c81f1cc8e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type McpOauthConnectionStatus = "connected" | "degraded" | "not_connected" | "%future added value";
export type McpServerAuthType = "authorization_header" | "none" | "oauth_authorization_code" | "oauth_client_credentials" | "%future added value";
export type ConnectMcpServerOAuthClientCredentialsInput = {
  mcpServerId: string;
  oauthClientId?: string | null | undefined;
  oauthClientSecret?: string | null | undefined;
  requestedScopes?: ReadonlyArray<string> | null | undefined;
};
export type mcpServersPageConnectClientCredentialsMutation$variables = {
  input: ConnectMcpServerOAuthClientCredentialsInput;
};
export type mcpServersPageConnectClientCredentialsMutation$data = {
  readonly ConnectMcpServerOAuthClientCredentials: {
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
export type mcpServersPageConnectClientCredentialsMutation = {
  response: mcpServersPageConnectClientCredentialsMutation$data;
  variables: mcpServersPageConnectClientCredentialsMutation$variables;
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
    "name": "ConnectMcpServerOAuthClientCredentials",
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
    "name": "mcpServersPageConnectClientCredentialsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServersPageConnectClientCredentialsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "8301c9a9a332ae2cdc6efbdc2b70c9a9",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageConnectClientCredentialsMutation",
    "operationKind": "mutation",
    "text": "mutation mcpServersPageConnectClientCredentialsMutation(\n  $input: ConnectMcpServerOAuthClientCredentialsInput!\n) {\n  ConnectMcpServerOAuthClientCredentials(input: $input) {\n    id\n    name\n    description\n    url\n    authType\n    headersText\n    callTimeoutMs\n    enabled\n    oauthClientId\n    oauthConnectionStatus\n    oauthGrantedScopes\n    oauthLastError\n    oauthRequestedScopes\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "71987f7aa1c25fb97578f9227edad20a";

export default node;
