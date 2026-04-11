/**
 * @generated SignedSource<<3210d996c3af90417c09f7cd9a74c02c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DetachMcpServerFromAgentInput = {
  agentId: string;
  mcpServerId: string;
};
export type agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation$variables = {
  input: DetachMcpServerFromAgentInput;
};
export type agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation$data = {
  readonly DetachMcpServerFromAgent: {
    readonly id: string;
  };
};
export type agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation = {
  response: agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation$data;
  variables: agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation$variables;
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
    "name": "DetachMcpServerFromAgent",
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
    "name": "agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5c77c8a05c28397bc3b9d21e1c79197c",
    "id": null,
    "metadata": {},
    "name": "agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation(\n  $input: DetachMcpServerFromAgentInput!\n) {\n  DetachMcpServerFromAgent(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "29c5efa9842513ad20c32366ba89edb3";

export default node;
