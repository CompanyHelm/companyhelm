/**
 * @generated SignedSource<<2c3eb4736b5b80f6cfb8c133613eb729>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type flowQuery$variables = Record<PropertyKey, never>;
export type flowQuery$data = {
  readonly GithubInstallations: ReadonlyArray<{
    readonly accountLogin: string | null | undefined;
    readonly id: string;
    readonly installationId: string;
  }>;
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
  }>;
  readonly ModelProviders: ReadonlyArray<{
    readonly authorizationInstructionsMarkdown: string | null | undefined;
    readonly id: string;
    readonly isAvailable: boolean;
    readonly name: string;
    readonly type: string;
  }>;
};
export type flowQuery = {
  response: flowQuery$data;
  variables: flowQuery$variables;
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
  "name": "name",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "GithubInstallation",
    "kind": "LinkedField",
    "name": "GithubInstallations",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "accountLogin",
        "storageKey": null
      },
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "installationId",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProvider",
    "kind": "LinkedField",
    "name": "ModelProviders",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isAvailable",
        "storageKey": null
      },
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "authorizationInstructionsMarkdown",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProviderCredential",
    "kind": "LinkedField",
    "name": "ModelProviderCredentials",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
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
        "name": "baseUrl",
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
    "name": "flowQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "flowQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "1afb1818a8310b2e92bc35ba4faccf5b",
    "id": null,
    "metadata": {},
    "name": "flowQuery",
    "operationKind": "query",
    "text": "query flowQuery {\n  GithubInstallations {\n    accountLogin\n    id\n    installationId\n  }\n  ModelProviders {\n    id\n    isAvailable\n    name\n    type\n    authorizationInstructionsMarkdown\n  }\n  ModelProviderCredentials {\n    id\n    name\n    modelProvider\n    baseUrl\n  }\n}\n"
  }
};
})();

(node as any).hash = "e6bb562109f47d0357bbd07e9ebec99f";

export default node;
