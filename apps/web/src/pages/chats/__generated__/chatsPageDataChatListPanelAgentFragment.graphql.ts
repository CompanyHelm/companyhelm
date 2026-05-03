/**
 * @generated SignedSource<<2e5cae296d8eb2ead196cfb4f3604e62>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type chatsPageDataChatListPanelAgentFragment$data = {
  readonly id: string;
  readonly modelName: string | null | undefined;
  readonly modelProvider: string | null | undefined;
  readonly modelProviderCredentialModelId: string | null | undefined;
  readonly name: string;
  readonly platformModelId: string | null | undefined;
  readonly reasoningLevel: string | null | undefined;
  readonly " $fragmentType": "chatsPageDataChatListPanelAgentFragment";
};
export type chatsPageDataChatListPanelAgentFragment$key = {
  readonly " $data"?: chatsPageDataChatListPanelAgentFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"chatsPageDataChatListPanelAgentFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "chatsPageDataChatListPanelAgentFragment",
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
      "name": "name",
      "storageKey": null
    },
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
      "name": "modelProvider",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "modelName",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "reasoningLevel",
      "storageKey": null
    }
  ],
  "type": "Agent",
  "abstractKey": null
};

(node as any).hash = "a270486e77ccbbcb099a802ff97245a3";

export default node;
