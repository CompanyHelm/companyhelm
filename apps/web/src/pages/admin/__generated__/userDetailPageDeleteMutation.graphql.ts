/**
 * @generated SignedSource<<a5d76bcdc19b31553f4fbb5a46b1c175>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeletePlatformAdminUserInput = {
  confirmationEmail: string;
  userId: string;
};
export type userDetailPageDeleteMutation$variables = {
  input: DeletePlatformAdminUserInput;
};
export type userDetailPageDeleteMutation$data = {
  readonly DeletePlatformAdminUser: {
    readonly clerkUserId: string | null | undefined;
    readonly email: string;
    readonly id: string;
    readonly membershipCount: number;
  };
};
export type userDetailPageDeleteMutation = {
  response: userDetailPageDeleteMutation$data;
  variables: userDetailPageDeleteMutation$variables;
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
    "concreteType": "PlatformAdminUserDeletionPayload",
    "kind": "LinkedField",
    "name": "DeletePlatformAdminUser",
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
        "name": "clerkUserId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "membershipCount",
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
    "name": "userDetailPageDeleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "userDetailPageDeleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "9c5400a1ec82cb4b6607636249de2a52",
    "id": null,
    "metadata": {},
    "name": "userDetailPageDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation userDetailPageDeleteMutation(\n  $input: DeletePlatformAdminUserInput!\n) {\n  DeletePlatformAdminUser(input: $input) {\n    id\n    email\n    clerkUserId\n    membershipCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "15e66ad806a84dd550f0e69a9b0bb947";

export default node;
