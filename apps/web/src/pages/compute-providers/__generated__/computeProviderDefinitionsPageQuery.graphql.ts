/**
 * @generated SignedSource<<5382500d55d7cb9316a51703e3caba01>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type computeProviderDefinitionsPageQuery$variables = Record<PropertyKey, never>;
export type computeProviderDefinitionsPageQuery$data = {
  readonly ComputeProviderDefinitions: ReadonlyArray<{
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly e2b: {
      readonly hasApiKey: boolean;
    } | null | undefined;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly provider: string;
    readonly updatedAt: string;
  }>;
};
export type computeProviderDefinitionsPageQuery = {
  response: computeProviderDefinitionsPageQuery$data;
  variables: computeProviderDefinitionsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "ComputeProviderDefinition",
    "kind": "LinkedField",
    "name": "ComputeProviderDefinitions",
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
        "name": "provider",
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
        "concreteType": "E2bComputeProviderDefinition",
        "kind": "LinkedField",
        "name": "e2b",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "hasApiKey",
            "storageKey": null
          }
        ],
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
    "name": "computeProviderDefinitionsPageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "computeProviderDefinitionsPageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "42ffcebc2d88eff2647c8364df3dac5f",
    "id": null,
    "metadata": {},
    "name": "computeProviderDefinitionsPageQuery",
    "operationKind": "query",
    "text": "query computeProviderDefinitionsPageQuery {\n  ComputeProviderDefinitions {\n    id\n    isDefault\n    name\n    provider\n    description\n    e2b {\n      hasApiKey\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "116d98760720adbda715af92ddfb1a52";

export default node;
