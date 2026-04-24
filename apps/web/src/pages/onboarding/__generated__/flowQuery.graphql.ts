/**
 * @generated SignedSource<<6beb5203aaec7feabaa260a996d80f23>>
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
export type flowQuery$variables = Record<PropertyKey, never>;
export type flowQuery$data = {
  readonly GithubInstallations: ReadonlyArray<{
    readonly accountLogin: string | null | undefined;
    readonly id: string;
    readonly installationId: string;
  }>;
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly onboarding: {
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
  };
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly id: string;
    readonly isManaged: boolean;
    readonly modelProvider: string;
    readonly name: string;
  }>;
  readonly ModelProviders: ReadonlyArray<{
    readonly authorizationInstructionsMarkdown: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly type: string;
  }>;
};
export type flowQuery = {
  response: flowQuery$data;
  variables: flowQuery$variables;
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
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v2 = [
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
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "GithubInstallation",
    "kind": "LinkedField",
    "name": "GithubInstallations",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "accountLogin",
        "storageKey": null
      },
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "installationId",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProvider",
    "kind": "LinkedField",
    "name": "ModelProviders",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "authorizationInstructionsMarkdown",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProviderCredential",
    "kind": "LinkedField",
    "name": "ModelProviderCredentials",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProvider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "baseUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isManaged",
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
    "name": "flowQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "flowQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "02bcf3e40c832fbc14681d8b3f4ffa18",
    "id": null,
    "metadata": {},
    "name": "flowQuery",
    "operationKind": "query",
    "text": "query flowQuery {\n  Me {\n    company {\n      id\n      onboarding {\n        id\n        companyId\n        status\n        companyMission\n        missionSkippedAt\n        githubSetupStatus\n        githubCompletedAt\n        githubSkippedAt\n        llmSetupStatus\n        llmCompletedAt\n        llmSkippedAt\n        agentId\n        sessionId\n        workflowRunId\n        updatedAt\n      }\n    }\n  }\n  GithubInstallations {\n    accountLogin\n    id\n    installationId\n  }\n  ModelProviders {\n    id\n    name\n    type\n    authorizationInstructionsMarkdown\n  }\n  ModelProviderCredentials {\n    id\n    name\n    modelProvider\n    baseUrl\n    isManaged\n  }\n}\n"
  }
};
})();

(node as any).hash = "a6902aec1cfab2b9cdc15ecefc35be7b";

export default node;
