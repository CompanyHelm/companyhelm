/**
 * @generated SignedSource<<92bc4d0638f5f7682f8e3aed17ad39b8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type SessionMessageErrorKind = "CONTEXT_LENGTH_EXCEEDED" | "CYBERSECURITY_RISK" | "UNKNOWN" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type chatsPageDataChatTranscriptPaneMessageFragment$data = {
  readonly contents: ReadonlyArray<{
    readonly arguments: any | null | undefined;
    readonly data: string | null | undefined;
    readonly mimeType: string | null | undefined;
    readonly structuredContent: any | null | undefined;
    readonly text: string | null | undefined;
    readonly toolCallId: string | null | undefined;
    readonly toolName: string | null | undefined;
    readonly type: string;
  }>;
  readonly createdAt: string;
  readonly errorKind: SessionMessageErrorKind | null | undefined;
  readonly errorMessage: string | null | undefined;
  readonly id: string;
  readonly isError: boolean;
  readonly principalType: string;
  readonly role: string;
  readonly sessionId: string;
  readonly status: string;
  readonly taskRunId: string | null | undefined;
  readonly text: string;
  readonly toolCallId: string | null | undefined;
  readonly toolName: string | null | undefined;
  readonly turn: {
    readonly endedAt: string | null | undefined;
    readonly id: string;
    readonly startedAt: string;
  };
  readonly turnId: string;
  readonly updatedAt: string;
  readonly workflowRunId: string | null | undefined;
  readonly " $fragmentType": "chatsPageDataChatTranscriptPaneMessageFragment";
};
export type chatsPageDataChatTranscriptPaneMessageFragment$key = {
  readonly " $data"?: chatsPageDataChatTranscriptPaneMessageFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"chatsPageDataChatTranscriptPaneMessageFragment">;
};

const node: ReaderFragment = (function(){
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
  "name": "toolCallId",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolName",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "text",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "chatsPageDataChatTranscriptPaneMessageFragment",
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
      "name": "turnId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "SessionTurn",
      "kind": "LinkedField",
      "name": "turn",
      "plural": false,
      "selections": [
        (v0/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "startedAt",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "endedAt",
          "storageKey": null
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "role",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "status",
      "storageKey": null
    },
    (v1/*: any*/),
    (v2/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "principalType",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "taskRunId",
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
      "concreteType": "SessionMessageContent",
      "kind": "LinkedField",
      "name": "contents",
      "plural": true,
      "selections": [
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "type",
          "storageKey": null
        },
        (v3/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "data",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "mimeType",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "structuredContent",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "arguments",
          "storageKey": null
        },
        (v1/*: any*/),
        (v2/*: any*/)
      ],
      "storageKey": null
    },
    (v3/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isError",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "errorMessage",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "errorKind",
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
      "kind": "ScalarField",
      "name": "updatedAt",
      "storageKey": null
    }
  ],
  "type": "SessionMessage",
  "abstractKey": null
};
})();

(node as any).hash = "4d9cb6ee1f7258e1367adf3188c1c55d";

export default node;
