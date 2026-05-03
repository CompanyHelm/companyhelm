/**
 * @generated SignedSource<<faf5cdee5263273873145307ced3ccdd>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type chatsPageDataChatListPanelSessionFragment$data = {
  readonly agentId: string;
  readonly associatedTask: {
    readonly id: string;
    readonly name: string;
    readonly status: string;
  } | null | undefined;
  readonly associatedWorkflowRun: {
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly steps: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly ordinal: number;
      readonly status: string;
      readonly workflowRunId: string;
    }>;
    readonly workflowDefinitionId: string;
  } | null | undefined;
  readonly createdAt: string;
  readonly hasUnread: boolean;
  readonly id: string;
  readonly inferredTitle: string | null | undefined;
  readonly lastUserMessageAt: string | null | undefined;
  readonly status: string;
  readonly userSetTitle: string | null | undefined;
  readonly " $fragmentType": "chatsPageDataChatListPanelSessionFragment";
};
export type chatsPageDataChatListPanelSessionFragment$key = {
  readonly " $data"?: chatsPageDataChatListPanelSessionFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"chatsPageDataChatListPanelSessionFragment">;
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
  "name": "name",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "chatsPageDataChatListPanelSessionFragment",
  "selections": [
    (v0/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "agentId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "SessionAssociatedTask",
      "kind": "LinkedField",
      "name": "associatedTask",
      "plural": false,
      "selections": [
        (v0/*: any*/),
        (v1/*: any*/),
        (v2/*: any*/)
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "SessionAssociatedWorkflowRun",
      "kind": "LinkedField",
      "name": "associatedWorkflowRun",
      "plural": false,
      "selections": [
        (v0/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "workflowDefinitionId",
          "storageKey": null
        },
        (v1/*: any*/),
        (v2/*: any*/),
        {
          "alias": null,
          "args": null,
          "concreteType": "WorkflowRunStep",
          "kind": "LinkedField",
          "name": "steps",
          "plural": true,
          "selections": [
            (v0/*: any*/),
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "workflowRunId",
              "storageKey": null
            },
            (v1/*: any*/),
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "ordinal",
              "storageKey": null
            },
            (v2/*: any*/)
          ],
          "storageKey": null
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "hasUnread",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "inferredTitle",
      "storageKey": null
    },
    (v2/*: any*/),
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
      "name": "lastUserMessageAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "userSetTitle",
      "storageKey": null
    }
  ],
  "type": "Session",
  "abstractKey": null
};
})();

(node as any).hash = "5cb2b9f619e0e3da76d03327c406f068";

export default node;
