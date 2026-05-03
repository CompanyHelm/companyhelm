/**
 * @generated SignedSource<<fa004c69e0f4c09050b2e2cd1a1f80de>>
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
    "cacheID": "5510cde66fa96d625b1756c2dac3f8fb",
    "id": null,
    "metadata": {},
    "name": "userDetailPageDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation userDetailPageDeleteMutation(\n  $input: DeletePlatformAdminUserInput!\n) {\n  DeletePlatformAdminUser(input: $input) {\n    id\n    email\n    membershipCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "48dbfd409710a7abfdf574a10b7f41eb";

export default node;
