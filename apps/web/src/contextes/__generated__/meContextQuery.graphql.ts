/**
 * @generated SignedSource<<681ece270fcedaa16324aa0d18198833>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyMemberRole = "admin" | "member" | "%future added value";
export type CompanyMemberStatus = "active" | "invited" | "%future added value";
export type CompanyOnboardingLlmSetupStatus = "pending" | "skipped" | "third_party" | "%future added value";
export type CompanyOnboardingSetupStatus = "completed" | "pending" | "skipped" | "%future added value";
export type CompanyOnboardingStatus = "completed" | "in_progress" | "not_started" | "skipped" | "%future added value";
export type meContextQuery$variables = Record<PropertyKey, never>;
export type meContextQuery$data = {
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
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
    readonly companyEntitlements: {
      readonly canDeleteCompany: boolean;
      readonly canInviteMembers: boolean;
      readonly canManageMemberRoles: boolean;
    };
    readonly companyMembership: {
      readonly role: CompanyMemberRole;
      readonly status: CompanyMemberStatus;
    } | null | undefined;
    readonly serverVersion: string;
    readonly user: {
      readonly email: string;
      readonly firstName: string;
      readonly id: string;
      readonly lastName: string | null | undefined;
    };
  };
};
export type meContextQuery = {
  response: meContextQuery$data;
  variables: meContextQuery$variables;
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
  "name": "status",
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
            "name": "email",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "firstName",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "lastName",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
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
            "kind": "ScalarField",
            "name": "name",
            "storageKey": null
          },
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
              (v1/*: any*/),
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
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "MeCompanyMembership",
        "kind": "LinkedField",
        "name": "companyMembership",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "role",
            "storageKey": null
          },
          (v1/*: any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "MeCompanyEntitlements",
        "kind": "LinkedField",
        "name": "companyEntitlements",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "canDeleteCompany",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "canInviteMembers",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "canManageMemberRoles",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "serverVersion",
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
    "name": "meContextQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "meContextQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "23014f26a6e80c006d39a11b40e31983",
    "id": null,
    "metadata": {},
    "name": "meContextQuery",
    "operationKind": "query",
    "text": "query meContextQuery {\n  Me {\n    user {\n      id\n      email\n      firstName\n      lastName\n    }\n    company {\n      id\n      name\n      onboarding {\n        id\n        companyId\n        status\n        companyMission\n        missionSkippedAt\n        githubSetupStatus\n        githubCompletedAt\n        githubSkippedAt\n        llmSetupStatus\n        llmCompletedAt\n        llmSkippedAt\n        agentId\n        sessionId\n        workflowRunId\n        updatedAt\n      }\n    }\n    companyMembership {\n      role\n      status\n    }\n    companyEntitlements {\n      canDeleteCompany\n      canInviteMembers\n      canManageMemberRoles\n    }\n    serverVersion\n  }\n}\n"
  }
};
})();

(node as any).hash = "5da55ec1d6e8893c4233be8c8dd9d1fa";

export default node;
