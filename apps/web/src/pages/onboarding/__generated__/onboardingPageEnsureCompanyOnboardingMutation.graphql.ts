/**
 * @generated SignedSource<<889db47d917e1ae00d08f87bde2fb736>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyOnboardingStatus = "completed" | "in_progress" | "not_started" | "skipped" | "%future added value";
export type onboardingPageEnsureCompanyOnboardingMutation$variables = Record<PropertyKey, never>;
export type onboardingPageEnsureCompanyOnboardingMutation$data = {
  readonly EnsureCompanyOnboarding: {
    readonly agentId: string | null | undefined;
    readonly companyId: string;
    readonly id: string;
    readonly sessionId: string | null | undefined;
    readonly status: CompanyOnboardingStatus;
    readonly updatedAt: string;
    readonly workflowRunId: string | null | undefined;
  };
};
export type onboardingPageEnsureCompanyOnboardingMutation = {
  response: onboardingPageEnsureCompanyOnboardingMutation$data;
  variables: onboardingPageEnsureCompanyOnboardingMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "CompanyOnboarding",
    "kind": "LinkedField",
    "name": "EnsureCompanyOnboarding",
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
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "onboardingPageEnsureCompanyOnboardingMutation",
    "selections": (v0/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "onboardingPageEnsureCompanyOnboardingMutation",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "84c716762359599d5a0d0c9f30e8a572",
    "id": null,
    "metadata": {},
    "name": "onboardingPageEnsureCompanyOnboardingMutation",
    "operationKind": "mutation",
    "text": "mutation onboardingPageEnsureCompanyOnboardingMutation {\n  EnsureCompanyOnboarding {\n    id\n    companyId\n    status\n    agentId\n    sessionId\n    workflowRunId\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4ea45d1e9212cff06ea3de69746120b1";

export default node;
