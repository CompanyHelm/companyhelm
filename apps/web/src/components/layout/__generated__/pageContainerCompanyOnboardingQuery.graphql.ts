/**
 * @generated SignedSource<<4330fdaeea4a4a4275950b2613834425>>
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
  "name": "id",
  "storageKey": null
},
v1 = [
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
        "concreteType": "AuthenticatedCompany",
        "kind": "LinkedField",
        "name": "company",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "CompanyOnboarding",
            "kind": "LinkedField",
            "name": "onboarding",
            "plural": false,
            "selections": [
              (v0/*: any*/),
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
    "name": "pageContainerCompanyOnboardingQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "pageContainerCompanyOnboardingQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "64e3c1eb8bb2fc3826aeccdf862cb958",
    "id": null,
    "metadata": {},
    "name": "pageContainerCompanyOnboardingQuery",
    "operationKind": "query",
    "text": "query pageContainerCompanyOnboardingQuery {\n  Me {\n    company {\n      id\n      onboarding {\n        id\n        status\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "8f4d0a0826bfa949e5d906974c757700";

export default node;
