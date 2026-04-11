/**
 * @generated SignedSource<<787b32bf99906a1073c5b448ab533679>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SteerSessionQueuedMessageInput = {
  id: string;
};
export type chatsPageDataSteerSessionQueuedMessageMutation$variables = {
  input: SteerSessionQueuedMessageInput;
};
export type chatsPageDataSteerSessionQueuedMessageMutation$data = {
  readonly SteerSessionQueuedMessage: {
    readonly id: string;
    readonly sessionId: string;
    readonly shouldSteer: boolean;
    readonly status: string;
    readonly updatedAt: string;
  };
};
export type chatsPageDataSteerSessionQueuedMessageMutation = {
  response: chatsPageDataSteerSessionQueuedMessageMutation$data;
  variables: chatsPageDataSteerSessionQueuedMessageMutation$variables;
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
    "name": "SteerSessionQueuedMessage",
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
    "name": "chatsPageDataSteerSessionQueuedMessageMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataSteerSessionQueuedMessageMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "ffce659dbc2683482223ed85ffed97bf",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSteerSessionQueuedMessageMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataSteerSessionQueuedMessageMutation(\n  $input: SteerSessionQueuedMessageInput!\n) {\n  SteerSessionQueuedMessage(input: $input) {\n    id\n    sessionId\n    shouldSteer\n    status\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b88ba521b39740c9447eeaf1b4e0866e";

export default node;
