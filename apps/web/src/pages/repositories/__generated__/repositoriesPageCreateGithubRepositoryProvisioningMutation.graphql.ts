/**
 * @generated SignedSource<<5574b73f4c881f629345fc966f407058>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateGithubRepositoryProvisioningInput = {
  githubRepositoryId: string;
};
export type repositoriesPageCreateGithubRepositoryProvisioningMutation$variables = {
  input: CreateGithubRepositoryProvisioningInput;
};
export type repositoriesPageCreateGithubRepositoryProvisioningMutation$data = {
  readonly CreateGithubRepositoryProvisioning: {
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
  };
};
export type repositoriesPageCreateGithubRepositoryProvisioningMutation = {
  response: repositoriesPageCreateGithubRepositoryProvisioningMutation$data;
  variables: repositoriesPageCreateGithubRepositoryProvisioningMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "createdAt",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "updatedAt",
  "storageKey": null
},
v4 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "GithubRepositoryProvisioning",
    "kind": "LinkedField",
    "name": "CreateGithubRepositoryProvisioning",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "companyId",
        "storageKey": null
      },
      (v2/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "GithubRepository",
        "kind": "LinkedField",
        "name": "githubRepository",
        "plural": false,
        "selections": [
          (v1/*: any*/),
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
          (v2/*: any*/),
          (v3/*: any*/)
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
    "name": "repositoriesPageCreateGithubRepositoryProvisioningMutation",
    "selections": (v4/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "repositoriesPageCreateGithubRepositoryProvisioningMutation",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "b46e9af17b4cdb2cfe362b84a7861344",
    "id": null,
    "metadata": {},
    "name": "repositoriesPageCreateGithubRepositoryProvisioningMutation",
    "operationKind": "mutation",
    "text": "mutation repositoriesPageCreateGithubRepositoryProvisioningMutation(\n  $input: CreateGithubRepositoryProvisioningInput!\n) {\n  CreateGithubRepositoryProvisioning(input: $input) {\n    id\n    companyId\n    createdAt\n    updatedAt\n    githubRepository {\n      id\n      githubInstallationId\n      externalId\n      name\n      fullName\n      htmlUrl\n      isPrivate\n      defaultBranch\n      archived\n      createdAt\n      updatedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "5c734e1922443e944c3473f4c770eb8f";

export default node;
