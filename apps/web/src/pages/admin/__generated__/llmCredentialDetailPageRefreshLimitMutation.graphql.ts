/**
 * @generated SignedSource<<3c2b84723fd0c091ac01014dff3fc092>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RefreshPlatformCodexRateLimitsInput = {
  platformModelProviderCredentialId: string;
};
export type llmCredentialDetailPageRefreshLimitMutation$variables = {
  input: RefreshPlatformCodexRateLimitsInput;
};
export type llmCredentialDetailPageRefreshLimitMutation$data = {
  readonly RefreshPlatformCodexRateLimits: {
    readonly isCodexCredential: boolean;
    readonly snapshots: ReadonlyArray<{
      readonly credits: {
        readonly balance: string | null | undefined;
        readonly hasCredits: boolean | null | undefined;
        readonly unlimited: boolean | null | undefined;
      };
      readonly lastError: string | null | undefined;
      readonly limitId: string;
      readonly limitName: string | null | undefined;
      readonly planType: string | null | undefined;
      readonly primary: {
        readonly resetsAt: string | null | undefined;
        readonly usedPercent: number | null | undefined;
        readonly windowMinutes: number | null | undefined;
      };
      readonly rateLimitReachedType: string | null | undefined;
      readonly refreshedAt: string;
      readonly secondary: {
        readonly resetsAt: string | null | undefined;
        readonly usedPercent: number | null | undefined;
        readonly windowMinutes: number | null | undefined;
      };
    }>;
  };
};
export type llmCredentialDetailPageRefreshLimitMutation = {
  response: llmCredentialDetailPageRefreshLimitMutation$data;
  variables: llmCredentialDetailPageRefreshLimitMutation$variables;
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
    "args": null,
    "kind": "ScalarField",
    "name": "resetsAt",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "usedPercent",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "windowMinutes",
    "storageKey": null
  }
],
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "CodexRateLimits",
    "kind": "LinkedField",
    "name": "RefreshPlatformCodexRateLimits",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isCodexCredential",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "CodexRateLimitSnapshot",
        "kind": "LinkedField",
        "name": "snapshots",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "CodexRateLimitCredits",
            "kind": "LinkedField",
            "name": "credits",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "balance",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "hasCredits",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "unlimited",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "lastError",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "limitId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "limitName",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "planType",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "CodexRateLimitWindow",
            "kind": "LinkedField",
            "name": "primary",
            "plural": false,
            "selections": (v1/*: any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "rateLimitReachedType",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "refreshedAt",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "CodexRateLimitWindow",
            "kind": "LinkedField",
            "name": "secondary",
            "plural": false,
            "selections": (v1/*: any*/),
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "llmCredentialDetailPageRefreshLimitMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialDetailPageRefreshLimitMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "438d6cda90781f8d677154a685d5a4d6",
    "id": null,
    "metadata": {},
    "name": "llmCredentialDetailPageRefreshLimitMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialDetailPageRefreshLimitMutation(\n  $input: RefreshPlatformCodexRateLimitsInput!\n) {\n  RefreshPlatformCodexRateLimits(input: $input) {\n    isCodexCredential\n    snapshots {\n      credits {\n        balance\n        hasCredits\n        unlimited\n      }\n      lastError\n      limitId\n      limitName\n      planType\n      primary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n      rateLimitReachedType\n      refreshedAt\n      secondary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "b0760dc52a5cb33451a73ea34bc3c90a";

export default node;
