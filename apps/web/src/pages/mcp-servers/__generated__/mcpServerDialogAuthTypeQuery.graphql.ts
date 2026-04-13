/**
 * @generated SignedSource<<3f7d1d4d4fe4baa551b478f9dbc770ab>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type McpServerAuthType = "authorization_header" | "none" | "oauth_authorization_code" | "oauth_client_credentials" | "%future added value";
export type mcpServerDialogAuthTypeQuery$variables = {
  url: string;
};
export type mcpServerDialogAuthTypeQuery$data = {
  readonly McpServerAuthType: {
    readonly detailMessage: string | null | undefined;
    readonly detectedAuthType: McpServerAuthType | null | undefined;
    readonly requiresManualClient: boolean;
    readonly wasAutoDetected: boolean;
  };
};
export type mcpServerDialogAuthTypeQuery = {
  response: mcpServerDialogAuthTypeQuery$data;
  variables: mcpServerDialogAuthTypeQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "url"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "url",
        "variableName": "url"
      }
    ],
    "concreteType": "McpServerAuthTypeDetection",
    "kind": "LinkedField",
    "name": "McpServerAuthType",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "detectedAuthType",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "detailMessage",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "requiresManualClient",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "wasAutoDetected",
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
    "name": "mcpServerDialogAuthTypeQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServerDialogAuthTypeQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e28b9a36ab186c8c3a2c43a984532b28",
    "id": null,
    "metadata": {},
    "name": "mcpServerDialogAuthTypeQuery",
    "operationKind": "query",
    "text": "query mcpServerDialogAuthTypeQuery(\n  $url: String!\n) {\n  McpServerAuthType(url: $url) {\n    detectedAuthType\n    detailMessage\n    requiresManualClient\n    wasAutoDetected\n  }\n}\n"
  }
};
})();

(node as any).hash = "47029f7447b9c57ae6d6e17002ea216d";

export default node;
