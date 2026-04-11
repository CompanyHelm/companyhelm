/**
 * @generated SignedSource<<797fc0977aefdff488fa7356d1b43eb2>>
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
export type chatsPageDataDeleteSessionQueuedMessageMutation$variables = {
  input: DeleteSessionQueuedMessageInput;
};
export type chatsPageDataDeleteSessionQueuedMessageMutation$data = {
  readonly DeleteSessionQueuedMessage: {
    readonly id: string;
    readonly sessionId: string;
    readonly shouldSteer: boolean;
    readonly status: string;
    readonly updatedAt: string;
  };
};
export type chatsPageDataDeleteSessionQueuedMessageMutation = {
  response: chatsPageDataDeleteSessionQueuedMessageMutation$data;
  variables: chatsPageDataDeleteSessionQueuedMessageMutation$variables;
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
    "name": "chatsPageDataDeleteSessionQueuedMessageMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataDeleteSessionQueuedMessageMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "44e26e9266c835800fb100571ed672f9",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataDeleteSessionQueuedMessageMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataDeleteSessionQueuedMessageMutation(\n  $input: DeleteSessionQueuedMessageInput!\n) {\n  DeleteSessionQueuedMessage(input: $input) {\n    id\n    sessionId\n    shouldSteer\n    status\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "64244b6a3232f323e8b51eade6a3e772";

export default node;
