/**
 * @generated SignedSource<<e767f12aae551e8dbc9601baf6cc6a73>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompleteMcpServerOAuthInput = {
  code: string;
  state: string;
};
export type mcpOauthCallbackPageCompleteMutation$variables = {
  input: CompleteMcpServerOAuthInput;
};
export type mcpOauthCallbackPageCompleteMutation$data = {
  readonly CompleteMcpServerOAuth: {
    readonly mcpServer: {
      readonly id: string;
    };
    readonly organizationSlug: string;
  };
};
export type mcpOauthCallbackPageCompleteMutation = {
  response: mcpOauthCallbackPageCompleteMutation$data;
  variables: mcpOauthCallbackPageCompleteMutation$variables;
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
    "concreteType": "CompleteMcpServerOAuthPayload",
    "kind": "LinkedField",
    "name": "CompleteMcpServerOAuth",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "organizationSlug",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "McpServer",
        "kind": "LinkedField",
        "name": "mcpServer",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          }
        ],
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
    "name": "mcpOauthCallbackPageCompleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpOauthCallbackPageCompleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "658757864f9666a966fd8170f563cdc3",
    "id": null,
    "metadata": {},
    "name": "mcpOauthCallbackPageCompleteMutation",
    "operationKind": "mutation",
    "text": "mutation mcpOauthCallbackPageCompleteMutation(\n  $input: CompleteMcpServerOAuthInput!\n) {\n  CompleteMcpServerOAuth(input: $input) {\n    organizationSlug\n    mcpServer {\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "9da61b21ef8ed52d936b72167481fc46";

export default node;
