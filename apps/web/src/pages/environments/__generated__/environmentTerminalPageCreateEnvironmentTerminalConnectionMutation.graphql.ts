/**
 * @generated SignedSource<<94ea5b76443525ba0f7d84b26dbff1c3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateEnvironmentTerminalConnectionInput = {
  columns?: number | null | undefined;
  id: string;
  rows?: number | null | undefined;
};
export type environmentTerminalPageCreateEnvironmentTerminalConnectionMutation$variables = {
  input: CreateEnvironmentTerminalConnectionInput;
};
export type environmentTerminalPageCreateEnvironmentTerminalConnectionMutation$data = {
  readonly CreateEnvironmentTerminalConnection: {
    readonly environmentId: string;
    readonly expiresAt: string;
    readonly terminalSessionId: string;
    readonly websocketUrl: string;
  };
};
export type environmentTerminalPageCreateEnvironmentTerminalConnectionMutation = {
  response: environmentTerminalPageCreateEnvironmentTerminalConnectionMutation$data;
  variables: environmentTerminalPageCreateEnvironmentTerminalConnectionMutation$variables;
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
    "concreteType": "EnvironmentTerminalConnection",
    "kind": "LinkedField",
    "name": "CreateEnvironmentTerminalConnection",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "environmentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "terminalSessionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "websocketUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "expiresAt",
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
    "name": "environmentTerminalPageCreateEnvironmentTerminalConnectionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentTerminalPageCreateEnvironmentTerminalConnectionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "258894c2d0e9a3bfda70639333d2e25e",
    "id": null,
    "metadata": {},
    "name": "environmentTerminalPageCreateEnvironmentTerminalConnectionMutation",
    "operationKind": "mutation",
    "text": "mutation environmentTerminalPageCreateEnvironmentTerminalConnectionMutation(\n  $input: CreateEnvironmentTerminalConnectionInput!\n) {\n  CreateEnvironmentTerminalConnection(input: $input) {\n    environmentId\n    terminalSessionId\n    websocketUrl\n    expiresAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4174b835cdeefbb4f96ece1d59b88a04";

export default node;
