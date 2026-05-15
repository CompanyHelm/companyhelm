/**
 * @generated SignedSource<<4e7e835609233c373b3e6dc85d38e656>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type McpOauthConnectionStatus = "connected" | "error" | "not_connected" | "reauth_required" | "%future added value";
export type McpServerAuthType = "authorization_header" | "none" | "oauth_authorization_code" | "oauth_client_credentials" | "%future added value";
export type McpServerValidationStatus = "auth_error" | "network_error" | "ok" | "protocol_error" | "server_error" | "unknown" | "%future added value";
export type UpdateMcpServerInput = {
  authType?: McpServerAuthType | null | undefined;
  callTimeoutMs?: number | null | undefined;
  description?: string | null | undefined;
  enabled?: boolean | null | undefined;
  headersText?: string | null | undefined;
  id: string;
  name?: string | null | undefined;
  url?: string | null | undefined;
};
export type mcpServersPageUpdateMutation$variables = {
  input: UpdateMcpServerInput;
};
export type mcpServersPageUpdateMutation$data = {
  readonly UpdateMcpServer: {
    readonly authType: McpServerAuthType;
    readonly callTimeoutMs: number;
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly enabled: boolean;
    readonly headersText: string;
    readonly id: string;
    readonly lastValidatedAt: string | null | undefined;
    readonly lastValidationError: string | null | undefined;
    readonly lastValidationStatus: McpServerValidationStatus;
    readonly lastValidationToolCount: number | null | undefined;
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
export type mcpServersPageUpdateMutation = {
  response: mcpServersPageUpdateMutation$data;
  variables: mcpServersPageUpdateMutation$variables;
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
    "name": "UpdateMcpServer",
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
        "name": "lastValidationStatus",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastValidationError",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastValidationToolCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastValidatedAt",
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
    "name": "mcpServersPageUpdateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServersPageUpdateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "281b8ebad5fb1185000e2d6e96ce6968",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageUpdateMutation",
    "operationKind": "mutation",
    "text": "mutation mcpServersPageUpdateMutation(\n  $input: UpdateMcpServerInput!\n) {\n  UpdateMcpServer(input: $input) {\n    id\n    name\n    description\n    url\n    authType\n    headersText\n    callTimeoutMs\n    enabled\n    oauthClientId\n    oauthConnectionStatus\n    oauthGrantedScopes\n    oauthLastError\n    oauthRequestedScopes\n    lastValidationStatus\n    lastValidationError\n    lastValidationToolCount\n    lastValidatedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "85a31c71448451a07652922f6e5bd6a2";

export default node;
