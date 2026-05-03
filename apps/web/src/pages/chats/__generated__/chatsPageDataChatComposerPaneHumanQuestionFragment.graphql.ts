/**
 * @generated SignedSource<<8612a0d0ccf121e208ae4b63032b0efe>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type chatsPageDataChatComposerPaneHumanQuestionFragment$data = {
  readonly allowCustomAnswer: boolean;
  readonly createdAt: string;
  readonly id: string;
  readonly proposals: ReadonlyArray<{
    readonly answerText: string;
    readonly id: string;
    readonly rating: number;
  }>;
  readonly questionText: string;
  readonly sessionId: string;
  readonly title: string;
  readonly " $fragmentType": "chatsPageDataChatComposerPaneHumanQuestionFragment";
};
export type chatsPageDataChatComposerPaneHumanQuestionFragment$key = {
  readonly " $data"?: chatsPageDataChatComposerPaneHumanQuestionFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"chatsPageDataChatComposerPaneHumanQuestionFragment">;
};

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "chatsPageDataChatComposerPaneHumanQuestionFragment",
  "selections": [
    (v0/*: any*/),
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
      "name": "title",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "questionText",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "allowCustomAnswer",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "createdAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "InboxHumanQuestionProposal",
      "kind": "LinkedField",
      "name": "proposals",
      "plural": true,
      "selections": [
        (v0/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "answerText",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "rating",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "InboxHumanQuestion",
  "abstractKey": null
};
})();

(node as any).hash = "afe0fbe0d042a528ad33431a96514b57";

export default node;
