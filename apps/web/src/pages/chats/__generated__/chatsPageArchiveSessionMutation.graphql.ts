/**
 * @generated SignedSource<<69e5a32474f0add52a7cd0a3abf753e3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ArchiveSessionInput = {
  id: string;
};
export type chatsPageArchiveSessionMutation$variables = {
  input: ArchiveSessionInput;
};
export type chatsPageArchiveSessionMutation$data = {
  readonly ArchiveSession: {
    readonly agentId: string;
    readonly createdAt: string;
    readonly id: string;
    readonly modelId: string;
    readonly reasoningLevel: string;
    readonly status: string;
    readonly updatedAt: string;
  };
};
export type chatsPageArchiveSessionMutation = {
  response: chatsPageArchiveSessionMutation$data;
  variables: chatsPageArchiveSessionMutation$variables;
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
    "name": "ArchiveSession",
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
        "name": "agentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningLevel",
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
    "name": "chatsPageArchiveSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageArchiveSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "44e837de962f421031300b82006a4a2a",
    "id": null,
    "metadata": {},
    "name": "chatsPageArchiveSessionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageArchiveSessionMutation(\n  $input: ArchiveSessionInput!\n) {\n  ArchiveSession(input: $input) {\n    id\n    agentId\n    modelId\n    reasoningLevel\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "249d5d11225fa221702f221f881aa01b";

export default node;
