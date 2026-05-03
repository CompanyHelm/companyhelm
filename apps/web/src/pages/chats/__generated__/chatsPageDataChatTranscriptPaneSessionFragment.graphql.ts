/**
 * @generated SignedSource<<7aff64285e43466b30910d2cc28268db>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type chatsPageDataChatTranscriptPaneSessionFragment$data = {
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
  readonly forkedFromSessionAgentId: string | null | undefined;
  readonly forkedFromSessionId: string | null | undefined;
  readonly forkedFromSessionTitle: string | null | undefined;
  readonly forkedFromTurnId: string | null | undefined;
  readonly id: string;
  readonly inferredTitle: string | null | undefined;
  readonly isCompacting: boolean;
  readonly status: string;
  readonly userSetTitle: string | null | undefined;
  readonly " $fragmentType": "chatsPageDataChatTranscriptPaneSessionFragment";
};
export type chatsPageDataChatTranscriptPaneSessionFragment$key = {
  readonly " $data"?: chatsPageDataChatTranscriptPaneSessionFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"chatsPageDataChatTranscriptPaneSessionFragment">;
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
  "name": "chatsPageDataChatTranscriptPaneSessionFragment",
  "selections": [
    (v0/*: any*/),
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
      "name": "forkedFromSessionAgentId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "forkedFromSessionId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "forkedFromSessionTitle",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "forkedFromTurnId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "inferredTitle",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isCompacting",
      "storageKey": null
    },
    (v2/*: any*/),
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

(node as any).hash = "a79c6c27dc07561ebce58e943e522b19";

export default node;
