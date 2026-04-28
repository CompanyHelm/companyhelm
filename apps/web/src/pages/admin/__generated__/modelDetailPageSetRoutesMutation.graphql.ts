/**
 * @generated SignedSource<<ed640c1eb3161c5c6637f8f2195b584c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetPlatformModelRoutesInput = {
  platformModelId: string;
  platformModelProviderCredentialModelIds: ReadonlyArray<string>;
};
export type modelDetailPageSetRoutesMutation$variables = {
  input: SetPlatformModelRoutesInput;
};
export type modelDetailPageSetRoutesMutation$data = {
  readonly SetPlatformModelRoutes: {
    readonly id: string;
    readonly routeCount: number;
    readonly updatedAt: string;
  };
};
export type modelDetailPageSetRoutesMutation = {
  response: modelDetailPageSetRoutesMutation$data;
  variables: modelDetailPageSetRoutesMutation$variables;
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
    "concreteType": "PlatformModel",
    "kind": "LinkedField",
    "name": "SetPlatformModelRoutes",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "modelDetailPageSetRoutesMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelDetailPageSetRoutesMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "bf44c3bd359ef48ddcaac0c50f2f4c2f",
    "id": null,
    "metadata": {},
    "name": "modelDetailPageSetRoutesMutation",
    "operationKind": "mutation",
    "text": "mutation modelDetailPageSetRoutesMutation(\n  $input: SetPlatformModelRoutesInput!\n) {\n  SetPlatformModelRoutes(input: $input) {\n    id\n    routeCount\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "c4755f11068d1cb7374c1b7843407d7b";

export default node;
