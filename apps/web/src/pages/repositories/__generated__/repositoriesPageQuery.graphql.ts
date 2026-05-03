/**
 * @generated SignedSource<<0dd6b6a09f2587c20160aefbc0df7336>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type repositoriesPageQuery$variables = Record<PropertyKey, never>;
export type repositoriesPageQuery$data = {
  readonly GithubInstallations: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly installationId: string;
  }>;
  readonly GithubRepositories: ReadonlyArray<{
    readonly archived: boolean;
    readonly createdAt: string;
    readonly defaultBranch: string | null | undefined;
    readonly externalId: string;
    readonly fullName: string;
    readonly githubInstallationId: string;
    readonly htmlUrl: string | null | undefined;
    readonly id: string;
    readonly isPrivate: boolean;
    readonly name: string;
    readonly updatedAt: string;
  }>;
  readonly GithubRepositoryProvisionings: ReadonlyArray<{
    readonly companyId: string;
    readonly createdAt: string;
    readonly githubRepository: {
      readonly archived: boolean;
      readonly createdAt: string;
      readonly defaultBranch: string | null | undefined;
      readonly externalId: string;
      readonly fullName: string;
      readonly githubInstallationId: string;
      readonly htmlUrl: string | null | undefined;
      readonly id: string;
      readonly isPrivate: boolean;
      readonly name: string;
      readonly updatedAt: string;
    };
    readonly id: string;
    readonly updatedAt: string;
  }>;
};
export type repositoriesPageQuery = {
  response: repositoriesPageQuery$data;
  variables: repositoriesPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v3 = [
  (v0/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "githubInstallationId",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "externalId",
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
    "name": "fullName",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "htmlUrl",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "isPrivate",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "defaultBranch",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "archived",
    "storageKey": null
  },
  (v1/*: any*/),
  (v2/*: any*/)
],
v4 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "GithubInstallation",
    "kind": "LinkedField",
    "name": "GithubInstallations",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "installationId",
        "storageKey": null
      },
      (v1/*: any*/)
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "GithubRepository",
    "kind": "LinkedField",
    "name": "GithubRepositories",
    "plural": true,
    "selections": (v3/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "GithubRepositoryProvisioning",
    "kind": "LinkedField",
    "name": "GithubRepositoryProvisionings",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "companyId",
        "storageKey": null
      },
      (v1/*: any*/),
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "GithubRepository",
        "kind": "LinkedField",
        "name": "githubRepository",
        "plural": false,
        "selections": (v3/*: any*/),
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
    "name": "repositoriesPageQuery",
    "selections": (v4/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "repositoriesPageQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "3a728136df0cbdead478c05541416154",
    "id": null,
    "metadata": {},
    "name": "repositoriesPageQuery",
    "operationKind": "query",
    "text": "query repositoriesPageQuery {\n  GithubInstallations {\n    id\n    installationId\n    createdAt\n  }\n  GithubRepositories {\n    id\n    githubInstallationId\n    externalId\n    name\n    fullName\n    htmlUrl\n    isPrivate\n    defaultBranch\n    archived\n    createdAt\n    updatedAt\n  }\n  GithubRepositoryProvisionings {\n    id\n    companyId\n    createdAt\n    updatedAt\n    githubRepository {\n      id\n      githubInstallationId\n      externalId\n      name\n      fullName\n      htmlUrl\n      isPrivate\n      defaultBranch\n      archived\n      createdAt\n      updatedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "de35ffbdb6d38ee4125e44df13cff14d";

export default node;
