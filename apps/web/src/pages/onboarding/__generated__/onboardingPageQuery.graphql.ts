/**
 * @generated SignedSource<<b07f935fbf0c7cd4cbc41ab6b5c812be>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyOnboardingStatus = "completed" | "in_progress" | "not_started" | "skipped" | "%future added value";
export type onboardingPageQuery$variables = Record<PropertyKey, never>;
export type onboardingPageQuery$data = {
  readonly Me: {
    readonly company: {
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
export type onboardingPageQuery = {
  response: onboardingPageQuery$data;
  variables: onboardingPageQuery$variables;
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
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "onboardingPageQuery",
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
            "concreteType": "AuthenticatedCompany",
            "kind": "LinkedField",
            "name": "company",
            "plural": false,
            "selections": [
              (v1/*: any*/)
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
    "name": "onboardingPageQuery",
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
            "concreteType": "AuthenticatedCompany",
            "kind": "LinkedField",
            "name": "company",
            "plural": false,
            "selections": [
              (v1/*: any*/),
              (v0/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "c6dcdde4f06f2fc66d65a156b0d2ee10",
    "id": null,
    "metadata": {},
    "name": "onboardingPageQuery",
    "operationKind": "query",
    "text": "query onboardingPageQuery {\n  Me {\n    company {\n      onboarding {\n        id\n        companyId\n        status\n        agentId\n        sessionId\n        workflowRunId\n        updatedAt\n      }\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "fc71cd28743a5c23e173b64c944f2a9a";

export default node;
