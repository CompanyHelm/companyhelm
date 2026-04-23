/**
 * @generated SignedSource<<90b08db15862e23429f0efa282bc969b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyOnboardingStatus = "completed" | "in_progress" | "not_started" | "skipped" | "%future added value";
export type pageContainerCompanyOnboardingQuery$variables = Record<PropertyKey, never>;
export type pageContainerCompanyOnboardingQuery$data = {
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly onboarding: {
        readonly id: string;
        readonly status: CompanyOnboardingStatus;
      };
    };
    readonly user: {
      readonly isPlatformAdmin: boolean;
    };
  };
};
export type pageContainerCompanyOnboardingQuery = {
  response: pageContainerCompanyOnboardingQuery$data;
  variables: pageContainerCompanyOnboardingQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isPlatformAdmin",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "concreteType": "AuthenticatedCompany",
  "kind": "LinkedField",
  "name": "company",
  "plural": false,
  "selections": [
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "concreteType": "CompanyOnboarding",
      "kind": "LinkedField",
      "name": "onboarding",
      "plural": false,
      "selections": [
        (v1/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "status",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "pageContainerCompanyOnboardingQuery",
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
          },
          (v2/*: any*/)
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
    "name": "pageContainerCompanyOnboardingQuery",
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
              (v1/*: any*/)
            ],
            "storageKey": null
          },
          (v2/*: any*/)
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "bf86ff029a20f63f16de40ad4c3d0c43",
    "id": null,
    "metadata": {},
    "name": "pageContainerCompanyOnboardingQuery",
    "operationKind": "query",
    "text": "query pageContainerCompanyOnboardingQuery {\n  Me {\n    user {\n      isPlatformAdmin\n      id\n    }\n    company {\n      id\n      onboarding {\n        id\n        status\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "7f235b01d18560bb0df81d36068d3052";

export default node;
