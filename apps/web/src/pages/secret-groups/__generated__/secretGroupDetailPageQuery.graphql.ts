/**
 * @generated SignedSource<<1c67f21b47b5710582a862b1f1114d95>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type secretGroupDetailPageQuery$variables = {
  secretGroupId: string;
};
export type secretGroupDetailPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly SecretGroup: {
    readonly companyId: string;
    readonly id: string;
    readonly name: string;
  };
  readonly SecretGroupAgents: ReadonlyArray<{
    readonly agentId: string;
    readonly id: string;
    readonly name: string;
  }>;
  readonly Secrets: ReadonlyArray<{
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly secretGroupId: string | null | undefined;
  }>;
};
export type secretGroupDetailPageQuery = {
  response: secretGroupDetailPageQuery$data;
  variables: secretGroupDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "secretGroupId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "secretGroupId",
        "variableName": "secretGroupId"
      }
    ],
    "concreteType": "SecretGroupAgent",
    "kind": "LinkedField",
    "name": "SecretGroupAgents",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "agentId",
        "storageKey": null
      },
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "secretGroupId"
      }
    ],
    "concreteType": "SecretGroup",
    "kind": "LinkedField",
    "name": "SecretGroup",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "companyId",
        "storageKey": null
      },
      (v2/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "Secrets",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "envVarName",
        "storageKey": null
      },
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "secretGroupId",
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
    "name": "secretGroupDetailPageQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupDetailPageQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "ac505020bb75d249443c5689f76b864b",
    "id": null,
    "metadata": {},
    "name": "secretGroupDetailPageQuery",
    "operationKind": "query",
    "text": "query secretGroupDetailPageQuery(\n  $secretGroupId: ID!\n) {\n  Agents {\n    id\n    name\n  }\n  SecretGroupAgents(secretGroupId: $secretGroupId) {\n    agentId\n    id\n    name\n  }\n  SecretGroup(id: $secretGroupId) {\n    id\n    companyId\n    name\n  }\n  Secrets {\n    id\n    envVarName\n    name\n    secretGroupId\n  }\n}\n"
  }
};
})();

(node as any).hash = "a629ffb943147b7945b7a15d1c3d33ad";

export default node;
