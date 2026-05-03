/**
 * @generated SignedSource<<408ddd77013c9cf00edcce5a95f97d1a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type chatsPageDataChatComposerPaneSessionFragment$data = {
  readonly currentContextTokens: number | null | undefined;
  readonly id: string;
  readonly isCompacting: boolean;
  readonly isThinking: boolean;
  readonly maxContextTokens: number | null | undefined;
  readonly status: string;
  readonly " $fragmentType": "chatsPageDataChatComposerPaneSessionFragment";
};
export type chatsPageDataChatComposerPaneSessionFragment$key = {
  readonly " $data"?: chatsPageDataChatComposerPaneSessionFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"chatsPageDataChatComposerPaneSessionFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "chatsPageDataChatComposerPaneSessionFragment",
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
      "name": "currentContextTokens",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isCompacting",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isThinking",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "maxContextTokens",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "status",
      "storageKey": null
    }
  ],
  "type": "Session",
  "abstractKey": null
};

(node as any).hash = "78e3ef921d86f80570dbdccbbfaccbf0";

export default node;
