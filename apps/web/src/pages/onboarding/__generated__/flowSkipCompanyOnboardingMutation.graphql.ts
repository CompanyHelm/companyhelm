/**
 * @generated SignedSource<<efab9d0733e09733d246a824945a584a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyOnboardingLlmSetupStatus = "company_managed" | "pending" | "skipped" | "third_party" | "%future added value";
export type CompanyOnboardingSetupStatus = "completed" | "pending" | "skipped" | "%future added value";
export type CompanyOnboardingStatus = "completed" | "in_progress" | "not_started" | "skipped" | "%future added value";
export type flowSkipCompanyOnboardingMutation$variables = Record<PropertyKey, never>;
export type flowSkipCompanyOnboardingMutation$data = {
  readonly SkipCompanyOnboarding: {
    readonly agentId: string | null | undefined;
    readonly companyId: string;
    readonly companyMission: string | null | undefined;
    readonly githubCompletedAt: string | null | undefined;
    readonly githubSetupStatus: CompanyOnboardingSetupStatus;
    readonly githubSkippedAt: string | null | undefined;
    readonly id: string;
    readonly llmCompletedAt: string | null | undefined;
    readonly llmSetupStatus: CompanyOnboardingLlmSetupStatus;
    readonly llmSkippedAt: string | null | undefined;
    readonly missionSkippedAt: string | null | undefined;
    readonly sessionId: string | null | undefined;
    readonly status: CompanyOnboardingStatus;
    readonly updatedAt: string;
    readonly workflowRunId: string | null | undefined;
  };
};
export type flowSkipCompanyOnboardingMutation = {
  response: flowSkipCompanyOnboardingMutation$data;
  variables: flowSkipCompanyOnboardingMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "CompanyOnboarding",
    "kind": "LinkedField",
    "name": "SkipCompanyOnboarding",
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
        "name": "companyMission",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "missionSkippedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "githubSetupStatus",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "githubCompletedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "githubSkippedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "llmSetupStatus",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "llmCompletedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "llmSkippedAt",
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
    "name": "flowSkipCompanyOnboardingMutation",
    "selections": (v0/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "flowSkipCompanyOnboardingMutation",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "209fed28e7779ffced556786e111216d",
    "id": null,
    "metadata": {},
    "name": "flowSkipCompanyOnboardingMutation",
    "operationKind": "mutation",
    "text": "mutation flowSkipCompanyOnboardingMutation {\n  SkipCompanyOnboarding {\n    id\n    companyId\n    status\n    companyMission\n    missionSkippedAt\n    githubSetupStatus\n    githubCompletedAt\n    githubSkippedAt\n    llmSetupStatus\n    llmCompletedAt\n    llmSkippedAt\n    agentId\n    sessionId\n    workflowRunId\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "da259b6368c2c5d07370fefee127f73c";

export default node;
