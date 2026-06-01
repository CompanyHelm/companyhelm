/**
 * @generated SignedSource<<1941393356398a850bead0af9f59edee>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataComposerSetupQuery$variables = Record<PropertyKey, never>;
export type chatsPageDataComposerSetupQuery$data = {
  readonly AgentCreateOptions: ReadonlyArray<{
    readonly defaultModelId: string | null | undefined;
    readonly defaultReasoningLevel: string | null | undefined;
    readonly id: string;
    readonly label: string;
    readonly modelProvider: string;
    readonly models: ReadonlyArray<{
      readonly description: string;
      readonly id: string;
      readonly modelId: string;
      readonly modelOptions: any;
      readonly modelProviderCredentialModelId: string | null | undefined;
      readonly name: string;
      readonly reasoningLevels: ReadonlyArray<string>;
      readonly reasoningSupported: boolean;
    }>;
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
v1 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "AgentCreateProviderOption",
    "kind": "LinkedField",
    "name": "AgentCreateOptions",
    "plural": true,
    "selections": [
      (v0/*: any*/),
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
            "name": "modelOptions",
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageDataComposerSetupQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageDataComposerSetupQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "21f7d16377d03115e4f57d4baea6e382",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataComposerSetupQuery",
    "operationKind": "query",
    "text": "query chatsPageDataComposerSetupQuery {\n  AgentCreateOptions {\n    id\n    label\n    modelProvider\n    defaultModelId\n    defaultReasoningLevel\n    models {\n      id\n      modelProviderCredentialModelId\n      modelId\n      name\n      description\n      reasoningSupported\n      reasoningLevels\n      modelOptions\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "67213615bb40c2018853033524c540f9";

export default node;
