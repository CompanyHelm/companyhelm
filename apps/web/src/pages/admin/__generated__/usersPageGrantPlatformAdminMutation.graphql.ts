/**
 * @generated SignedSource<<eac570357345d66c12c21873e10a7ec2>>
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
    "cacheID": "e893a52be0c4c43d1ed90cd24d5dc5aa",
    "id": null,
    "metadata": {},
    "name": "usersPageGrantPlatformAdminMutation",
    "operationKind": "mutation",
    "text": "mutation usersPageGrantPlatformAdminMutation(\n  $input: GrantPlatformAdminInput!\n) {\n  GrantPlatformAdmin(input: $input) {\n    id\n    email\n    firstName\n    lastName\n    isPlatformAdmin\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "f0a97f336c4cfe0222c9abaa351c3461";

export default node;
