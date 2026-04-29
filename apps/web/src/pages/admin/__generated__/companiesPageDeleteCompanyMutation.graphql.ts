/**
 * @generated SignedSource<<afbd987369ad975f54449540a6872681>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeletePlatformAdminCompanyInput = {
  companyId: string;
  confirmationName: string;
};
export type companiesPageDeleteCompanyMutation$variables = {
  input: DeletePlatformAdminCompanyInput;
};
export type companiesPageDeleteCompanyMutation$data = {
  readonly DeletePlatformAdminCompany: {
    readonly id: string;
    readonly name: string;
  };
};
export type companiesPageDeleteCompanyMutation = {
  response: companiesPageDeleteCompanyMutation$data;
  variables: companiesPageDeleteCompanyMutation$variables;
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
    "concreteType": "PlatformAdminCompanyDeletionPayload",
    "kind": "LinkedField",
    "name": "DeletePlatformAdminCompany",
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
        "name": "name",
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
    "name": "companiesPageDeleteCompanyMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "companiesPageDeleteCompanyMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "d8403485d45a67b489d9947f67c3d756",
    "id": null,
    "metadata": {},
    "name": "companiesPageDeleteCompanyMutation",
    "operationKind": "mutation",
    "text": "mutation companiesPageDeleteCompanyMutation(\n  $input: DeletePlatformAdminCompanyInput!\n) {\n  DeletePlatformAdminCompany(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "cd926b6d23172cd7d15cf0bda882e53d";

export default node;
