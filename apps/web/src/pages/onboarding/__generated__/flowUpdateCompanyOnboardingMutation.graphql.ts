/**
 * @generated SignedSource<<9b31f9738a63d1467bf4241dea64e086>>
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
export type UpdateCompanyOnboardingInput = {
  companyMission?: string | null | undefined;
  githubSetupStatus?: CompanyOnboardingSetupStatus | null | undefined;
  llmSetupStatus?: CompanyOnboardingLlmSetupStatus | null | undefined;
  skipMission?: boolean | null | undefined;
};
export type flowUpdateCompanyOnboardingMutation$variables = {
  input: UpdateCompanyOnboardingInput;
};
export type flowUpdateCompanyOnboardingMutation$data = {
  readonly UpdateCompanyOnboarding: {
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
export type flowUpdateCompanyOnboardingMutation = {
  response: flowUpdateCompanyOnboardingMutation$data;
  variables: flowUpdateCompanyOnboardingMutation$variables;
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
    "concreteType": "CompanyOnboarding",
    "kind": "LinkedField",
    "name": "UpdateCompanyOnboarding",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "flowUpdateCompanyOnboardingMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "flowUpdateCompanyOnboardingMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "d9b5449bcc97a43f54442c96a6ac30f2",
    "id": null,
    "metadata": {},
    "name": "flowUpdateCompanyOnboardingMutation",
    "operationKind": "mutation",
    "text": "mutation flowUpdateCompanyOnboardingMutation(\n  $input: UpdateCompanyOnboardingInput!\n) {\n  UpdateCompanyOnboarding(input: $input) {\n    id\n    companyId\n    status\n    companyMission\n    missionSkippedAt\n    githubSetupStatus\n    githubCompletedAt\n    githubSkippedAt\n    llmSetupStatus\n    llmCompletedAt\n    llmSkippedAt\n    agentId\n    sessionId\n    workflowRunId\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "e3a6d8db5abade3cf76e20dc49cf4a58";

export default node;
