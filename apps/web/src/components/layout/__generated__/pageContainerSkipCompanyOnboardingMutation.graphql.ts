/**
 * @generated SignedSource<<9629dc4d40671df3a155b5fcd0d309bd>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyOnboardingStatus = "completed" | "in_progress" | "not_started" | "skipped" | "%future added value";
export type pageContainerSkipCompanyOnboardingMutation$variables = Record<PropertyKey, never>;
export type pageContainerSkipCompanyOnboardingMutation$data = {
  readonly SkipCompanyOnboarding: {
    readonly agentId: string | null | undefined;
    readonly companyId: string;
    readonly id: string;
    readonly sessionId: string | null | undefined;
    readonly status: CompanyOnboardingStatus;
    readonly updatedAt: string;
    readonly workflowRunId: string | null | undefined;
  };
};
export type pageContainerSkipCompanyOnboardingMutation = {
  response: pageContainerSkipCompanyOnboardingMutation$data;
  variables: pageContainerSkipCompanyOnboardingMutation$variables;
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
    "name": "pageContainerSkipCompanyOnboardingMutation",
    "selections": (v0/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "pageContainerSkipCompanyOnboardingMutation",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "6de29bd5004c4821319fead549f3b486",
    "id": null,
    "metadata": {},
    "name": "pageContainerSkipCompanyOnboardingMutation",
    "operationKind": "mutation",
    "text": "mutation pageContainerSkipCompanyOnboardingMutation {\n  SkipCompanyOnboarding {\n    id\n    companyId\n    status\n    agentId\n    sessionId\n    workflowRunId\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "7388520bc4dd951959f1286b9fc46514";

export default node;
