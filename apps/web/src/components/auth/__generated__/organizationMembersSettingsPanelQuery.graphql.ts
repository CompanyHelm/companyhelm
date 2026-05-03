/**
 * @generated SignedSource<<7fbd6401a178f325e118f331d9d3be97>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyMemberRole = "admin" | "member" | "%future added value";
export type CompanyMemberStatus = "active" | "invited" | "%future added value";
export type organizationMembersSettingsPanelQuery$variables = Record<PropertyKey, never>;
export type organizationMembersSettingsPanelQuery$data = {
  readonly CompanyMembers: ReadonlyArray<{
    readonly createdAt: string;
    readonly emailAddress: string;
    readonly id: string;
    readonly name: string;
    readonly role: CompanyMemberRole;
    readonly status: CompanyMemberStatus;
    readonly updatedAt: string;
    readonly userId: string;
  }>;
};
export type organizationMembersSettingsPanelQuery = {
  response: organizationMembersSettingsPanelQuery$data;
  variables: organizationMembersSettingsPanelQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "CompanyMemberAccess",
    "kind": "LinkedField",
    "name": "CompanyMembers",
    "plural": true,
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
        "name": "createdAt",
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
        "name": "name",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "role",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "organizationMembersSettingsPanelQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "organizationMembersSettingsPanelQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "2c945b76b2c9530d2c7d2108e87560f5",
    "id": null,
    "metadata": {},
    "name": "organizationMembersSettingsPanelQuery",
    "operationKind": "query",
    "text": "query organizationMembersSettingsPanelQuery {\n  CompanyMembers {\n    id\n    createdAt\n    emailAddress\n    name\n    role\n    status\n    updatedAt\n    userId\n  }\n}\n"
  }
};
})();

(node as any).hash = "8ac206df4c6ab3e145ad379c361d85ac";

export default node;
