/**
 * @generated SignedSource<<320e867c3b124218ef701beae3c1b248>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteSessionInput = {
  sessionId: string;
};
export type agentArchivedChatsTabDeleteSessionMutation$variables = {
  input: DeleteSessionInput;
};
export type agentArchivedChatsTabDeleteSessionMutation$data = {
  readonly DeleteSession: {
    readonly id: string;
  };
};
export type agentArchivedChatsTabDeleteSessionMutation = {
  response: agentArchivedChatsTabDeleteSessionMutation$data;
  variables: agentArchivedChatsTabDeleteSessionMutation$variables;
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
    "name": "DeleteSession",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
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
    "name": "agentArchivedChatsTabDeleteSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentArchivedChatsTabDeleteSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "ccefda326266638e3af45c0d2b8e9ed2",
    "id": null,
    "metadata": {},
    "name": "agentArchivedChatsTabDeleteSessionMutation",
    "operationKind": "mutation",
    "text": "mutation agentArchivedChatsTabDeleteSessionMutation(\n  $input: DeleteSessionInput!\n) {\n  DeleteSession(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "a277016882f357ca6128c92e106ecaa2";

export default node;
