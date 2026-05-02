/**
 * @generated SignedSource<<a7dee6f8139af738fd8c22ef97147206>>
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
    readonly clerkUserId: string | null | undefined;
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
        "name": "clerkUserId",
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
    "cacheID": "a25c3fbb8fedfa0672bfed97dbea8350",
    "id": null,
    "metadata": {},
    "name": "usersPageGrantPlatformAdminMutation",
    "operationKind": "mutation",
    "text": "mutation usersPageGrantPlatformAdminMutation(\n  $input: GrantPlatformAdminInput!\n) {\n  GrantPlatformAdmin(input: $input) {\n    id\n    clerkUserId\n    email\n    firstName\n    lastName\n    isPlatformAdmin\n    companyCount\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4335578e12cb23662f7a507a785cee4d";

export default node;
