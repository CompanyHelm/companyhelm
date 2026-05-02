/**
 * @generated SignedSource<<93c6c9b16f0f9d5c376666bc1fad2547>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RemoveCompanyMemberInput = {
  userId: string;
};
export type organizationMembersSettingsPanelRemoveMutation$variables = {
  input: RemoveCompanyMemberInput;
};
export type organizationMembersSettingsPanelRemoveMutation$data = {
  readonly RemoveCompanyMember: {
    readonly emailAddress: string;
    readonly id: string;
    readonly userId: string;
  };
};
export type organizationMembersSettingsPanelRemoveMutation = {
  response: organizationMembersSettingsPanelRemoveMutation$data;
  variables: organizationMembersSettingsPanelRemoveMutation$variables;
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
    "concreteType": "CompanyMemberAccess",
    "kind": "LinkedField",
    "name": "RemoveCompanyMember",
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
        "name": "emailAddress",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "userId",
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
    "name": "organizationMembersSettingsPanelRemoveMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "organizationMembersSettingsPanelRemoveMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "783f2e22015b39579f47bc76514c312e",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelRemoveMutation",
    "operationKind": "mutation",
    "text": "mutation organizationMembersSettingsPanelRemoveMutation(\n  $input: RemoveCompanyMemberInput!\n) {\n  RemoveCompanyMember(input: $input) {\n    id\n    emailAddress\n    userId\n  }\n}\n"
  }
};
})();

(node as any).hash = "7fcf666f2f6a6db1aea8c03dca067eed";

export default node;
