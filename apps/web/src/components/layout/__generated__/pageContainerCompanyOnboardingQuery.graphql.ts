/**
 * @generated SignedSource<<77a9f65331d757c48b2bb3bebeeaca22>>
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
        readonly agentId: string | null | undefined;
        readonly companyId: string;
        readonly id: string;
        readonly sessionId: string | null | undefined;
        readonly status: CompanyOnboardingStatus;
        readonly updatedAt: string;
        readonly workflowRunId: string | null | undefined;
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
                "name": "companyId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "status",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "agentId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "sessionId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "workflowRunId",
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
    "cacheID": "e7a0162f6137eb7ea5f4b9089235cd09",
    "id": null,
    "metadata": {},
    "name": "pageContainerCompanyOnboardingQuery",
    "operationKind": "query",
    "text": "query pageContainerCompanyOnboardingQuery {\n  Me {\n    company {\n      id\n      onboarding {\n        id\n        companyId\n        status\n        agentId\n        sessionId\n        workflowRunId\n        updatedAt\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "a2d6189b1e83c14e3a59cf19f2e43a40";

export default node;
