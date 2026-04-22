/**
 * @generated SignedSource<<6caa1b44e21d1a0082cdae9cc6749d23>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyOnboardingStatus = "completed" | "in_progress" | "not_started" | "skipped" | "%future added value";
export type pageContainerEnsureCompanyOnboardingMutation$variables = Record<PropertyKey, never>;
export type pageContainerEnsureCompanyOnboardingMutation$data = {
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
export type pageContainerEnsureCompanyOnboardingMutation = {
  response: pageContainerEnsureCompanyOnboardingMutation$data;
  variables: pageContainerEnsureCompanyOnboardingMutation$variables;
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
    "name": "pageContainerEnsureCompanyOnboardingMutation",
    "selections": (v0/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "pageContainerEnsureCompanyOnboardingMutation",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "63f1a61848724522a67838e54b6e7887",
    "id": null,
    "metadata": {},
    "name": "pageContainerEnsureCompanyOnboardingMutation",
    "operationKind": "mutation",
    "text": "mutation pageContainerEnsureCompanyOnboardingMutation {\n  EnsureCompanyOnboarding {\n    id\n    companyId\n    status\n    agentId\n    sessionId\n    workflowRunId\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4e3152b189b709f583dfe07748573496";

export default node;
