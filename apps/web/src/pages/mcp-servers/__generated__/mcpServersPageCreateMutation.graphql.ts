/**
 * @generated SignedSource<<3b760fc7c5a598f2b9c47316deea1c68>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateMcpServerInput = {
  callTimeoutMs?: number | null | undefined;
  description?: string | null | undefined;
  enabled?: boolean | null | undefined;
  headersText?: string | null | undefined;
  name: string;
  url: string;
};
export type mcpServersPageCreateMutation$variables = {
  input: CreateMcpServerInput;
};
export type mcpServersPageCreateMutation$data = {
  readonly CreateMcpServer: {
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
export type mcpServersPageCreateMutation = {
  response: mcpServersPageCreateMutation$data;
  variables: mcpServersPageCreateMutation$variables;
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
    "name": "CreateMcpServer",
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
    "name": "mcpServersPageCreateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "mcpServersPageCreateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "666b78c75ad82c2ed924c739ad75708c",
    "id": null,
    "metadata": {},
    "name": "mcpServersPageCreateMutation",
    "operationKind": "mutation",
    "text": "mutation mcpServersPageCreateMutation(\n  $input: CreateMcpServerInput!\n) {\n  CreateMcpServer(input: $input) {\n    id\n    name\n    description\n    url\n    headersText\n    callTimeoutMs\n    enabled\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "2c0afdecb22084ddb5cf751da99dade7";

export default node;
