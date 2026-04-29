/**
 * @generated SignedSource<<6b9daeda1cc485bb86126c9c6a487b83>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RevokeCompanyMemberInvitationInput = {
  userId: string;
};
export type organizationMembersSettingsPanelRevokeMutation$variables = {
  input: RevokeCompanyMemberInvitationInput;
};
export type organizationMembersSettingsPanelRevokeMutation$data = {
  readonly RevokeCompanyMemberInvitation: {
    readonly id: string;
  };
};
export type organizationMembersSettingsPanelRevokeMutation = {
  response: organizationMembersSettingsPanelRevokeMutation$data;
  variables: organizationMembersSettingsPanelRevokeMutation$variables;
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
    "concreteType": "CompanyMemberInvitation",
    "kind": "LinkedField",
    "name": "RevokeCompanyMemberInvitation",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
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
    "name": "organizationMembersSettingsPanelRevokeMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "organizationMembersSettingsPanelRevokeMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "29b65b11307a2f1c06fe4575e88c40d9",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelRevokeMutation",
    "operationKind": "mutation",
    "text": "mutation organizationMembersSettingsPanelRevokeMutation(\n  $input: RevokeCompanyMemberInvitationInput!\n) {\n  RevokeCompanyMemberInvitation(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "9b3d8f8b89b71eb5c7b032ae71aeff9c";

export default node;
