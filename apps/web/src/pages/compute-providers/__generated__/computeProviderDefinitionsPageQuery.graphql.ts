/**
 * @generated SignedSource<<47055e37ecd0109ee4181ce874d008c9>>
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
    readonly daytona: {
      readonly apiUrl: string;
    } | null | undefined;
    readonly description: string | null | undefined;
    readonly e2b: {
      readonly hasApiKey: boolean;
    } | null | undefined;
    readonly id: string;
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
        "concreteType": "DaytonaComputeProviderDefinition",
        "kind": "LinkedField",
        "name": "daytona",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "apiUrl",
            "storageKey": null
          }
        ],
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
    "cacheID": "be1fafac82eee708ccd2cb7b2b0b6304",
    "id": null,
    "metadata": {},
    "name": "computeProviderDefinitionsPageQuery",
    "operationKind": "query",
    "text": "query computeProviderDefinitionsPageQuery {\n  ComputeProviderDefinitions {\n    id\n    name\n    provider\n    description\n    daytona {\n      apiUrl\n    }\n    e2b {\n      hasApiKey\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "1cfa4631640af587992559db7bd3af51";

export default node;
