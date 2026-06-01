/**
 * @generated SignedSource<<e2c14b975d248c311f6e57482911a139>>
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
  readonly modelOptions: any;
  readonly modelProvider: string | null | undefined;
  readonly modelProviderCredentialModelId: string | null | undefined;
  readonly name: string;
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
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "modelOptions",
      "storageKey": null
    }
  ],
  "type": "Agent",
  "abstractKey": null
};

(node as any).hash = "ee91e7b13db8badd99f886d342a446c0";

export default node;
