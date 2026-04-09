/**
 * @generated SignedSource<<5ee1504cb76a34035228544315881e04>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type credentialDetailPageQuery$variables = {
  credentialId: string;
};
export type credentialDetailPageQuery$data = {
  readonly ModelProviderCredentialModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
  }>;
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly id: string;
    readonly modelProvider: string;
  }>;
};
export type credentialDetailPageQuery = {
  response: credentialDetailPageQuery$data;
  variables: credentialDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "credentialId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProviderCredential",
    "kind": "LinkedField",
    "name": "ModelProviderCredentials",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProvider",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "modelProviderCredentialId",
        "variableName": "credentialId"
      }
    ],
    "concreteType": "ModelProviderCredentialModel",
    "kind": "LinkedField",
    "name": "ModelProviderCredentialModels",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isDefault",
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
        "name": "reasoningSupported",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningLevels",
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
    "name": "credentialDetailPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "0db8c8df9d54f38335340e36a1e1fb5b",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageQuery",
    "operationKind": "query",
    "text": "query credentialDetailPageQuery(\n  $credentialId: ID!\n) {\n  ModelProviderCredentials {\n    id\n    modelProvider\n  }\n  ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {\n    id\n    isDefault\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n  }\n}\n"
  }
};
})();

(node as any).hash = "d25c0c2ce5e8baa236f4ec5301246bf7";

export default node;
