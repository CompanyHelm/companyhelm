/**
 * @generated SignedSource<<5ff988373e1c2e146952232549c77fa4>>
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
export type agentMcpServerDefaultsCardAttachMcpServerToAgentMutation$variables = {
  input: AttachMcpServerToAgentInput;
};
export type agentMcpServerDefaultsCardAttachMcpServerToAgentMutation$data = {
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
export type agentMcpServerDefaultsCardAttachMcpServerToAgentMutation = {
  response: agentMcpServerDefaultsCardAttachMcpServerToAgentMutation$data;
  variables: agentMcpServerDefaultsCardAttachMcpServerToAgentMutation$variables;
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
    "name": "agentMcpServerDefaultsCardAttachMcpServerToAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentMcpServerDefaultsCardAttachMcpServerToAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "495cd8182aa8fa8a7429a8c03066f9b5",
    "id": null,
    "metadata": {},
    "name": "agentMcpServerDefaultsCardAttachMcpServerToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentMcpServerDefaultsCardAttachMcpServerToAgentMutation(\n  $input: AttachMcpServerToAgentInput!\n) {\n  AttachMcpServerToAgent(input: $input) {\n    id\n    name\n    description\n    url\n    enabled\n    callTimeoutMs\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "f1ebd53663e3982b29968cc41244f59e";

export default node;
