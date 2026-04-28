/**
 * @generated SignedSource<<ae1472138d9a88a4adbcc2416f97901e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type modelsPageQuery$variables = Record<PropertyKey, never>;
export type modelsPageQuery$data = {
  readonly PlatformModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isAvailable: boolean;
    readonly isDefault: boolean;
    readonly key: string;
    readonly modelId: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
    readonly routeCount: number;
    readonly updatedAt: string;
  }>;
};
export type modelsPageQuery = {
  response: modelsPageQuery$data;
  variables: modelsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "PlatformModel",
    "kind": "LinkedField",
    "name": "PlatformModels",
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
        "name": "key",
        "storageKey": null
      },
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
        "name": "modelId",
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
        "name": "isAvailable",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "routeCount",
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
    "name": "modelsPageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "modelsPageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "87202f2e7a5b1a4ed40d7798d0d12b36",
    "id": null,
    "metadata": {},
    "name": "modelsPageQuery",
    "operationKind": "query",
    "text": "query modelsPageQuery {\n  PlatformModels {\n    id\n    key\n    modelProvider\n    modelId\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n    isDefault\n    isAvailable\n    routeCount\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "192218c958217e1ab1a8af6c7545307e";

export default node;
