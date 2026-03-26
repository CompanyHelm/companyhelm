/**
 * @generated SignedSource<<79bff51fde1e25d40babaf511fe1f528>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AddGithubInstallationInput = {
  installationId: string;
  setupAction?: string | null | undefined;
};
export type githubInstallCallbackPageAddGithubInstallationMutation$variables = {
  input: AddGithubInstallationInput;
};
export type githubInstallCallbackPageAddGithubInstallationMutation$data = {
  readonly AddGithubInstallation: {
    readonly githubInstallation: {
      readonly createdAt: string;
      readonly id: string;
      readonly installationId: string;
    };
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
export type githubInstallCallbackPageAddGithubInstallationMutation = {
  response: githubInstallCallbackPageAddGithubInstallationMutation$data;
  variables: githubInstallCallbackPageAddGithubInstallationMutation$variables;
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
v3 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "AddGithubInstallationPayload",
    "kind": "LinkedField",
    "name": "AddGithubInstallation",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "GithubInstallation",
        "kind": "LinkedField",
        "name": "githubInstallation",
        "plural": false,
        "selections": [
          (v1/*: any*/),
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
        "name": "repositories",
        "plural": true,
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
    "name": "githubInstallCallbackPageAddGithubInstallationMutation",
    "selections": (v3/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "githubInstallCallbackPageAddGithubInstallationMutation",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "290be6bd66f9095599be315f69560248",
    "id": null,
    "metadata": {},
    "name": "githubInstallCallbackPageAddGithubInstallationMutation",
    "operationKind": "mutation",
    "text": "mutation githubInstallCallbackPageAddGithubInstallationMutation(\n  $input: AddGithubInstallationInput!\n) {\n  AddGithubInstallation(input: $input) {\n    githubInstallation {\n      id\n      installationId\n      createdAt\n    }\n    repositories {\n      id\n      githubInstallationId\n      externalId\n      name\n      fullName\n      htmlUrl\n      isPrivate\n      defaultBranch\n      archived\n      createdAt\n      updatedAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "0292017961589a81a0d815584bd52060";

export default node;
