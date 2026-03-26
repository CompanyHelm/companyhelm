/**
 * @generated SignedSource<<bde213469ebf91b6588cc93fc3f18391>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RefreshGithubInstallationRepositoriesInput = {
  installationId: string;
};
export type repositoriesPageRefreshGithubInstallationRepositoriesMutation$variables = {
  input: RefreshGithubInstallationRepositoriesInput;
};
export type repositoriesPageRefreshGithubInstallationRepositoriesMutation$data = {
  readonly RefreshGithubInstallationRepositories: {
    readonly repositories: ReadonlyArray<{
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
  };
};
export type repositoriesPageRefreshGithubInstallationRepositoriesMutation = {
  response: repositoriesPageRefreshGithubInstallationRepositoriesMutation$data;
  variables: repositoriesPageRefreshGithubInstallationRepositoriesMutation$variables;
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
    "concreteType": "RefreshGithubInstallationRepositoriesPayload",
    "kind": "LinkedField",
    "name": "RefreshGithubInstallationRepositories",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "GithubRepository",
        "kind": "LinkedField",
        "name": "repositories",
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
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "repositoriesPageRefreshGithubInstallationRepositoriesMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "repositoriesPageRefreshGithubInstallationRepositoriesMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c827be7028c364c35fe8b0279783d7fc",
    "id": null,
    "metadata": {},
    "name": "repositoriesPageRefreshGithubInstallationRepositoriesMutation",
    "operationKind": "mutation",
    "text": "mutation repositoriesPageRefreshGithubInstallationRepositoriesMutation(\n  $input: RefreshGithubInstallationRepositoriesInput!\n) {\n  RefreshGithubInstallationRepositories(input: $input) {\n    repositories {\n      id\n      githubInstallationId\n      externalId\n      name\n      fullName\n      htmlUrl\n      isPrivate\n      defaultBranch\n      archived\n      createdAt\n      updatedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "09ed39eae216f7643a99d6db00c85a34";

export default node;
