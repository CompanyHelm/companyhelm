/**
 * @generated SignedSource<<75e0135160b17ab2c115e62d7177708a>>
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
  readonly Me: {
    readonly company: {
      readonly id: string;
      readonly name: string;
    };
  };
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
  "name": "name",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Me",
    "kind": "LinkedField",
    "name": "Me",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AuthenticatedCompany",
        "kind": "LinkedField",
        "name": "company",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/)
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  },
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
      (v2/*: any*/)
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
    "selections": [
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
      (v1/*: any*/),
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
      (v2/*: any*/),
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "repositoriesPageQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "repositoriesPageQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "c83b877ed36607659d2ec652be9c9e9a",
    "id": null,
    "metadata": {},
    "name": "repositoriesPageQuery",
    "operationKind": "query",
    "text": "query repositoriesPageQuery {\n  Me {\n    company {\n      id\n      name\n    }\n  }\n  GithubInstallations {\n    id\n    installationId\n    createdAt\n  }\n  GithubRepositories {\n    id\n    githubInstallationId\n    externalId\n    name\n    fullName\n    htmlUrl\n    isPrivate\n    defaultBranch\n    archived\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "38a137213fa4ec9dbc1d0fb6bd7c9995";

export default node;
