/**
 * @generated SignedSource<<a57acb4813fa3473d7aec1a8a56aab7f>>
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
    "cacheID": "ceae55e5387e5afc6523ce9374252a16",
    "id": null,
    "metadata": {},
    "name": "usersPageGrantPlatformAdminMutation",
    "operationKind": "mutation",
    "text": "mutation usersPageGrantPlatformAdminMutation(\n  $input: GrantPlatformAdminInput!\n) {\n  GrantPlatformAdmin(input: $input) {\n    id\n    clerkUserId\n    email\n    firstName\n    lastName\n    isPlatformAdmin\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "6d7c523b0b6ac442b3372c42e777ca93";

export default node;
