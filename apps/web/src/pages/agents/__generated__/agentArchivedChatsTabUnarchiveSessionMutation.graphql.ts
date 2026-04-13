/**
 * @generated SignedSource<<e39b7bd3afbe00f07f6e37efe2c4eecd>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UnarchiveSessionInput = {
  sessionId: string;
};
export type agentArchivedChatsTabUnarchiveSessionMutation$variables = {
  input: UnarchiveSessionInput;
};
export type agentArchivedChatsTabUnarchiveSessionMutation$data = {
  readonly UnarchiveSession: {
    readonly id: string;
    readonly status: string;
  };
};
export type agentArchivedChatsTabUnarchiveSessionMutation = {
  response: agentArchivedChatsTabUnarchiveSessionMutation$data;
  variables: agentArchivedChatsTabUnarchiveSessionMutation$variables;
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
    "concreteType": "Session",
    "kind": "LinkedField",
    "name": "UnarchiveSession",
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
        "name": "status",
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
    "name": "agentArchivedChatsTabUnarchiveSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentArchivedChatsTabUnarchiveSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e868c57062b4e999acfda4b4852faf34",
    "id": null,
    "metadata": {},
    "name": "agentArchivedChatsTabUnarchiveSessionMutation",
    "operationKind": "mutation",
    "text": "mutation agentArchivedChatsTabUnarchiveSessionMutation(\n  $input: UnarchiveSessionInput!\n) {\n  UnarchiveSession(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "8cdf4c77115dd6fc426f5b14ff0b6206";

export default node;
