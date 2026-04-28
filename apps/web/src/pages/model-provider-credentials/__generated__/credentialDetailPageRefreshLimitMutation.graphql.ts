/**
 * @generated SignedSource<<76e4d182466ff89b6bb8829c2c66ac8b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RefreshCodexRateLimitsInput = {
  modelProviderCredentialId: string;
};
export type credentialDetailPageRefreshLimitMutation$variables = {
  input: RefreshCodexRateLimitsInput;
};
export type credentialDetailPageRefreshLimitMutation$data = {
  readonly RefreshCodexRateLimits: {
    readonly isCodexCredential: boolean;
    readonly modelProviderCredentialId: string;
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
export type credentialDetailPageRefreshLimitMutation = {
  response: credentialDetailPageRefreshLimitMutation$data;
  variables: credentialDetailPageRefreshLimitMutation$variables;
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
    "name": "RefreshCodexRateLimits",
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
        "kind": "ScalarField",
        "name": "modelProviderCredentialId",
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
    "name": "credentialDetailPageRefreshLimitMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageRefreshLimitMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "57d3e3a220fe3470b76fb4475242c5e3",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageRefreshLimitMutation",
    "operationKind": "mutation",
    "text": "mutation credentialDetailPageRefreshLimitMutation(\n  $input: RefreshCodexRateLimitsInput!\n) {\n  RefreshCodexRateLimits(input: $input) {\n    isCodexCredential\n    modelProviderCredentialId\n    snapshots {\n      credits {\n        balance\n        hasCredits\n        unlimited\n      }\n      lastError\n      limitId\n      limitName\n      planType\n      primary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n      rateLimitReachedType\n      refreshedAt\n      secondary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "83fff112952c7d276be1f39e08de5f58";

export default node;
