/**
 * @generated SignedSource<<678568eadc54d54b56744f780fd1a964>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type llmCredentialDetailPageQuery$variables = {
  credentialId: string;
};
export type llmCredentialDetailPageQuery$data = {
  readonly PlatformCodexRateLimits: {
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
  readonly PlatformModelProviderCredentialModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly modelId: string;
    readonly name: string;
    readonly platformModelProviderCredentialId: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
    readonly updatedAt: string;
  }>;
  readonly PlatformModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly defaultModelId: string | null | undefined;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
  }>;
};
export type llmCredentialDetailPageQuery = {
  response: llmCredentialDetailPageQuery$data;
  variables: llmCredentialDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "credentialId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v3 = [
  {
    "kind": "Variable",
    "name": "platformModelProviderCredentialId",
    "variableName": "credentialId"
  }
],
v4 = [
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
v5 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "PlatformModelProviderCredential",
    "kind": "LinkedField",
    "name": "PlatformModelProviderCredentials",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "baseUrl",
        "storageKey": null
      },
      (v2/*: any*/),
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
        "name": "defaultModelId",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": (v3/*: any*/),
    "concreteType": "PlatformModelProviderCredentialModel",
    "kind": "LinkedField",
    "name": "PlatformModelProviderCredentialModels",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isDefault",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "platformModelProviderCredentialId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelId",
        "storageKey": null
      },
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningSupported",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningLevels",
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
  },
  {
    "alias": null,
    "args": (v3/*: any*/),
    "concreteType": "CodexRateLimits",
    "kind": "LinkedField",
    "name": "PlatformCodexRateLimits",
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
            "selections": (v4/*: any*/),
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
            "selections": (v4/*: any*/),
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
    "name": "llmCredentialDetailPageQuery",
    "selections": (v5/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialDetailPageQuery",
    "selections": (v5/*: any*/)
  },
  "params": {
    "cacheID": "5c0a69d7e8ff8b66cb4fe0499fbb20c8",
    "id": null,
    "metadata": {},
    "name": "llmCredentialDetailPageQuery",
    "operationKind": "query",
    "text": "query llmCredentialDetailPageQuery(\n  $credentialId: ID!\n) {\n  PlatformModelProviderCredentials {\n    id\n    baseUrl\n    name\n    modelProvider\n    defaultModelId\n  }\n  PlatformModelProviderCredentialModels(platformModelProviderCredentialId: $credentialId) {\n    id\n    isDefault\n    platformModelProviderCredentialId\n    modelId\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n    updatedAt\n  }\n  PlatformCodexRateLimits(platformModelProviderCredentialId: $credentialId) {\n    isCodexCredential\n    snapshots {\n      credits {\n        balance\n        hasCredits\n        unlimited\n      }\n      lastError\n      limitId\n      limitName\n      planType\n      primary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n      rateLimitReachedType\n      refreshedAt\n      secondary {\n        resetsAt\n        usedPercent\n        windowMinutes\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "3569a6e62f0be77a87cc4a888d56d58c";

export default node;
