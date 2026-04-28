/**
 * @generated SignedSource<<5103a2d80066a0479d5f2e695d56c563>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type GrantPlatformAdminInput = {
  userId: string;
};
export type usersPageGrantPlatformAdminMutation$variables = {
  input: GrantPlatformAdminInput;
};
export type usersPageGrantPlatformAdminMutation$data = {
  readonly GrantPlatformAdmin: {
    readonly companyCount: number;
    readonly createdAt: string;
    readonly email: string;
    readonly firstName: string;
    readonly id: string;
    readonly isPlatformAdmin: boolean;
    readonly lastName: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type usersPageGrantPlatformAdminMutation = {
  response: usersPageGrantPlatformAdminMutation$data;
  variables: usersPageGrantPlatformAdminMutation$variables;
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
    "concreteType": "PlatformAdminUser",
    "kind": "LinkedField",
    "name": "GrantPlatformAdmin",
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
        "name": "email",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "firstName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isPlatformAdmin",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "companyCount",
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
    "name": "usersPageGrantPlatformAdminMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "usersPageGrantPlatformAdminMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "4d6c447a246740d31cd32e3e402f1768",
    "id": null,
    "metadata": {},
    "name": "usersPageGrantPlatformAdminMutation",
    "operationKind": "mutation",
    "text": "mutation usersPageGrantPlatformAdminMutation(\n  $input: GrantPlatformAdminInput!\n) {\n  GrantPlatformAdmin(input: $input) {\n    id\n    email\n    firstName\n    lastName\n    isPlatformAdmin\n    companyCount\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "c1207e4b3ae3f500e2d5c88e157f882e";

export default node;
