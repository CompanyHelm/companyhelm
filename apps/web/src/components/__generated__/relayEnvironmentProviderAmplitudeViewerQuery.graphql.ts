/**
 * @generated SignedSource<<395c60d98fbfd7397566b465c83dfb4f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type relayEnvironmentProviderAmplitudeViewerQuery$variables = Record<PropertyKey, never>;
export type relayEnvironmentProviderAmplitudeViewerQuery$data = {
  readonly Me: {
    readonly user: {
      readonly isPlatformAdmin: boolean;
    };
  };
};
export type relayEnvironmentProviderAmplitudeViewerQuery = {
  response: relayEnvironmentProviderAmplitudeViewerQuery$data;
  variables: relayEnvironmentProviderAmplitudeViewerQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isPlatformAdmin",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "relayEnvironmentProviderAmplitudeViewerQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Me",
        "kind": "LinkedField",
        "name": "Me",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "MeUser",
            "kind": "LinkedField",
            "name": "user",
            "plural": false,
            "selections": [
              (v0/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "relayEnvironmentProviderAmplitudeViewerQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Me",
        "kind": "LinkedField",
        "name": "Me",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "MeUser",
            "kind": "LinkedField",
            "name": "user",
            "plural": false,
            "selections": [
              (v0/*: any*/),
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
    ]
  },
  "params": {
    "cacheID": "b68f92ec834d15b4ff7e9a007d685f8c",
    "id": null,
    "metadata": {},
    "name": "relayEnvironmentProviderAmplitudeViewerQuery",
    "operationKind": "query",
    "text": "query relayEnvironmentProviderAmplitudeViewerQuery {\n  Me {\n    user {\n      isPlatformAdmin\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "015788e88884dcc6d4fd5f9d382a2335";

export default node;
