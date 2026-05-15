/**
 * @generated SignedSource<<4241d3f5aed7562de2fa19dfcdecebf1>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AttachMcpServerToAgentInput = {
  agentId: string;
  mcpServerId: string;
};
export type mcpServersPageAttachMcpServerToAgentMutation$variables = {
  input: AttachMcpServerToAgentInput;
};
export type mcpServersPageAttachMcpServerToAgentMutation$data = {
  readonly AttachMcpServerToAgent: {
    readonly callTimeoutMs: number;
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly enabled: boolean;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
    readonly url: string;
  };
};
export type mcpServersPageAttachMcpServerToAgentMutation = {
  response: mcpServersPageAttachMcpServerToAgentMutation$data;
  variables: mcpServersPageAttachMcpServerToAgentMutation$variables;
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
    "name": "AttachMcpServerToAgent",
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
        "name": "name",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "url",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "enabled",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "callTimeoutMs",
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
    "name": "mcpServersPageAttachMcpServerToAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServersPageAttachMcpServerToAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2913f66de58f12c2f9fa7441a008e98c",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageAttachMcpServerToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation mcpServersPageAttachMcpServerToAgentMutation(\n  $input: AttachMcpServerToAgentInput!\n) {\n  AttachMcpServerToAgent(input: $input) {\n    id\n    name\n    description\n    url\n    enabled\n    callTimeoutMs\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "428a15987c85cf34e4fa1d1a81953ef3";

export default node;
