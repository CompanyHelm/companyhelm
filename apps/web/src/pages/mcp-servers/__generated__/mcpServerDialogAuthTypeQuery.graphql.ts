/**
 * @generated SignedSource<<060cbc00ce4504df40c82333941cd9bd>>
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
    "cacheID": "4eae83639dfdf1f5cef77b99e7c2f6c7",
    "id": null,
    "metadata": {},
    "name": "mcpServerDialogAuthTypeQuery",
    "operationKind": "query",
    "text": "query mcpServerDialogAuthTypeQuery(\n  $url: String!\n) {\n  McpServerAuthType(url: $url) {\n    detectedAuthType\n    detailMessage\n    wasAutoDetected\n  }\n}\n"
  }
};
})();

(node as any).hash = "aa69f6364afb5d1ce3b6600c2efc6137";

export default node;
