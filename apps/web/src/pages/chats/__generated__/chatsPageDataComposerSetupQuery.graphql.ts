/**
 * @generated SignedSource<<059b0cafca20535df5d7ea284f8d7024>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "plus" | "pro" | "%future added value";
export type chatsPageDataComposerSetupQuery$variables = Record<PropertyKey, never>;
export type chatsPageDataComposerSetupQuery$data = {
  readonly AgentCreateOptions: ReadonlyArray<{
    readonly defaultModelId: string | null | undefined;
    readonly defaultReasoningLevel: string | null | undefined;
    readonly id: string;
    readonly label: string;
    readonly modelCredentialSource: string;
    readonly modelProvider: string;
    readonly models: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly modelCredentialSource: string;
      readonly modelId: string;
      readonly modelProviderCredentialModelId: string | null | undefined;
      readonly name: string;
      readonly platformModelId: string | null | undefined;
      readonly reasoningLevels: ReadonlyArray<string>;
      readonly reasoningSupported: boolean;
    }>;
  }>;
  readonly BillingPlans: ReadonlyArray<{
    readonly key: CompanySubscriptionPlan;
    readonly name: string;
  }>;
  readonly CompanyWallet: {
    readonly currentPlan: CompanySubscriptionPlan;
  };
  readonly ModelProviders: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
};
export type chatsPageDataComposerSetupQuery = {
  response: chatsPageDataComposerSetupQuery$data;
  variables: chatsPageDataComposerSetupQuery$variables;
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
  "name": "modelCredentialSource",
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
    "alias": null,
    "args": null,
    "concreteType": "AgentCreateProviderOption",
    "kind": "LinkedField",
    "name": "AgentCreateOptions",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "label",
        "storageKey": null
      },
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultReasoningLevel",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AgentCreateModelOption",
        "kind": "LinkedField",
        "name": "models",
        "plural": true,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "platformModelId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "modelProviderCredentialModelId",
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
    "concreteType": "BillingPlan",
    "kind": "LinkedField",
    "name": "BillingPlans",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "key",
        "storageKey": null
      },
      (v2/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "CompanyWallet",
    "kind": "LinkedField",
    "name": "CompanyWallet",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "currentPlan",
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
      (v2/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageDataComposerSetupQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageDataComposerSetupQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "794ffa30fc4a912c17a3ffcfa126e400",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataComposerSetupQuery",
    "operationKind": "query",
    "text": "query chatsPageDataComposerSetupQuery {\n  AgentCreateOptions {\n    id\n    modelCredentialSource\n    label\n    modelProvider\n    defaultModelId\n    defaultReasoningLevel\n    models {\n      id\n      modelCredentialSource\n      platformModelId\n      modelProviderCredentialModelId\n      modelId\n      name\n      description\n      reasoningSupported\n      reasoningLevels\n    }\n  }\n  BillingPlans {\n    key\n    name\n  }\n  CompanyWallet {\n    currentPlan\n  }\n  ModelProviders {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "1642eddd59772e7d082f1b11a3bf7e64";

export default node;
