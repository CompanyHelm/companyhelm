/**
 * @generated SignedSource<<23419bf47f5ff3e1f9251457b6622de8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteSessionQueuedMessageInput = {
  id: string;
};
export type chatsPageDeleteSessionQueuedMessageMutation$variables = {
  input: DeleteSessionQueuedMessageInput;
};
export type chatsPageDeleteSessionQueuedMessageMutation$data = {
  readonly DeleteSessionQueuedMessage: {
    readonly claimedAt: string | null | undefined;
    readonly createdAt: string;
    readonly dispatchedAt: string | null | undefined;
    readonly id: string;
    readonly sessionId: string;
    readonly shouldSteer: boolean;
    readonly status: string;
    readonly text: string;
    readonly updatedAt: string;
  };
};
export type chatsPageDeleteSessionQueuedMessageMutation = {
  response: chatsPageDeleteSessionQueuedMessageMutation$data;
  variables: chatsPageDeleteSessionQueuedMessageMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "SessionQueuedMessage",
    "kind": "LinkedField",
    "name": "DeleteSessionQueuedMessage",
    "plural": false,
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
        "name": "sessionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "text",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "shouldSteer",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "claimedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "dispatchedAt",
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
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageDeleteSessionQueuedMessageMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDeleteSessionQueuedMessageMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e50ab242ea9319e2d9daf0c169228f97",
    "id": null,
    "metadata": {},
    "name": "chatsPageDeleteSessionQueuedMessageMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDeleteSessionQueuedMessageMutation(\n  $input: DeleteSessionQueuedMessageInput!\n) {\n  DeleteSessionQueuedMessage(input: $input) {\n    id\n    sessionId\n    text\n    shouldSteer\n    status\n    claimedAt\n    dispatchedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b939abc623eed869f00143bc1672c383";

export default node;
