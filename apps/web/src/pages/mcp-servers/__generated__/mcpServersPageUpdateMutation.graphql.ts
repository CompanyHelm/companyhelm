/**
 * @generated SignedSource<<9479e3a442cb82442ef114b8847c5382>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateMcpServerInput = {
  callTimeoutMs?: number | null | undefined;
  description?: string | null | undefined;
  enabled?: boolean | null | undefined;
  headersText?: string | null | undefined;
  id: string;
  name?: string | null | undefined;
  url?: string | null | undefined;
};
export type mcpServersPageUpdateMutation$variables = {
  input: UpdateMcpServerInput;
};
export type mcpServersPageUpdateMutation$data = {
  readonly UpdateMcpServer: {
    readonly callTimeoutMs: number;
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly enabled: boolean;
    readonly headersText: string;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
    readonly url: string;
  };
};
export type mcpServersPageUpdateMutation = {
  response: mcpServersPageUpdateMutation$data;
  variables: mcpServersPageUpdateMutation$variables;
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
    "name": "UpdateMcpServer",
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
        "name": "headersText",
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
        "name": "enabled",
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
    "name": "mcpServersPageUpdateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServersPageUpdateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "835bce84066231a426a9b0fbd39155d8",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageUpdateMutation",
    "operationKind": "mutation",
    "text": "mutation mcpServersPageUpdateMutation(\n  $input: UpdateMcpServerInput!\n) {\n  UpdateMcpServer(input: $input) {\n    id\n    name\n    description\n    url\n    headersText\n    callTimeoutMs\n    enabled\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "2013eb16705751d45aff7a943a21d3e8";

export default node;
