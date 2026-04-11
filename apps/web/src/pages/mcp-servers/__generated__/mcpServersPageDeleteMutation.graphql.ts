/**
 * @generated SignedSource<<e92b388078bb4d0a05027882e3f2ab62>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteMcpServerInput = {
  id: string;
};
export type mcpServersPageDeleteMutation$variables = {
  input: DeleteMcpServerInput;
};
export type mcpServersPageDeleteMutation$data = {
  readonly DeleteMcpServer: {
    readonly id: string;
  };
};
export type mcpServersPageDeleteMutation = {
  response: mcpServersPageDeleteMutation$data;
  variables: mcpServersPageDeleteMutation$variables;
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
    "concreteType": "McpServer",
    "kind": "LinkedField",
    "name": "DeleteMcpServer",
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
    "name": "mcpServersPageDeleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServersPageDeleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "72564eb5da616179b9f6b909fa0c3448",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation mcpServersPageDeleteMutation(\n  $input: DeleteMcpServerInput!\n) {\n  DeleteMcpServer(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "613ff07f2801d7a42cbe37eeaded45f5";

export default node;
