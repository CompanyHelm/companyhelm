/**
 * @generated SignedSource<<ae339aa18d8d37d3d858179f7872ac68>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateCompanyInput = {
  name: string;
};
export type companyCreationPageCreateMutation$variables = {
  input: CreateCompanyInput;
};
export type companyCreationPageCreateMutation$data = {
  readonly CreateCompany: {
    readonly clerkOrganizationId: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  };
};
export type companyCreationPageCreateMutation = {
  response: companyCreationPageCreateMutation$data;
  variables: companyCreationPageCreateMutation$variables;
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
    "concreteType": "CreatedCompany",
    "kind": "LinkedField",
    "name": "CreateCompany",
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "slug",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "clerkOrganizationId",
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
    "name": "companyCreationPageCreateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "companyCreationPageCreateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "6859b52fc2f7c680231a930b4c3b04f8",
    "id": null,
    "metadata": {},
    "name": "companyCreationPageCreateMutation",
    "operationKind": "mutation",
    "text": "mutation companyCreationPageCreateMutation(\n  $input: CreateCompanyInput!\n) {\n  CreateCompany(input: $input) {\n    id\n    name\n    slug\n    clerkOrganizationId\n  }\n}\n"
  }
};
})();

(node as any).hash = "7708005eea09479c6588d4965357de7a";

export default node;
