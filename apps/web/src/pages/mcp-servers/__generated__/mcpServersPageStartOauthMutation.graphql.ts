/**
 * @generated SignedSource<<23d741a50c762ee6bfd9b22c9c7a9ee8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type StartMcpServerOAuthInput = {
  mcpServerId: string;
  oauthClientId?: string | null | undefined;
  oauthClientSecret?: string | null | undefined;
  organizationSlug: string;
  requestedScopes?: ReadonlyArray<string> | null | undefined;
};
export type mcpServersPageStartOauthMutation$variables = {
  input: StartMcpServerOAuthInput;
};
export type mcpServersPageStartOauthMutation$data = {
  readonly StartMcpServerOAuth: {
    readonly authorizationUrl: string;
  };
};
export type mcpServersPageStartOauthMutation = {
  response: mcpServersPageStartOauthMutation$data;
  variables: mcpServersPageStartOauthMutation$variables;
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
    "concreteType": "StartMcpServerOAuthPayload",
    "kind": "LinkedField",
    "name": "StartMcpServerOAuth",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "authorizationUrl",
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
    "name": "mcpServersPageStartOauthMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServersPageStartOauthMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "20c26b222aec13a6ac0006e15bf032a3",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageStartOauthMutation",
    "operationKind": "mutation",
    "text": "mutation mcpServersPageStartOauthMutation(\n  $input: StartMcpServerOAuthInput!\n) {\n  StartMcpServerOAuth(input: $input) {\n    authorizationUrl\n  }\n}\n"
  }
};
})();

(node as any).hash = "4accf9c3345ac415c9a3cf4a3a237e4a";

export default node;
