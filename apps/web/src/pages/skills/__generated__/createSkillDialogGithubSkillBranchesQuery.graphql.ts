/**
 * @generated SignedSource<<c5e77c017fd99e01eb03e796b6e1f6b8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type createSkillDialogGithubSkillBranchesQuery$variables = {
  repositoryUrl: string;
};
export type createSkillDialogGithubSkillBranchesQuery$data = {
  readonly GithubSkillBranches: ReadonlyArray<{
    readonly commitSha: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly repository: string;
  }>;
};
export type createSkillDialogGithubSkillBranchesQuery = {
  response: createSkillDialogGithubSkillBranchesQuery$data;
  variables: createSkillDialogGithubSkillBranchesQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "repositoryUrl"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "repositoryUrl",
        "variableName": "repositoryUrl"
      }
    ],
    "concreteType": "GithubSkillBranch",
    "kind": "LinkedField",
    "name": "GithubSkillBranches",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "commitSha",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isDefault",
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
        "name": "repository",
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
    "name": "createSkillDialogGithubSkillBranchesQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "createSkillDialogGithubSkillBranchesQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "30d060482477112d316209fce87120b8",
    "id": null,
    "metadata": {},
    "name": "createSkillDialogGithubSkillBranchesQuery",
    "operationKind": "query",
    "text": "query createSkillDialogGithubSkillBranchesQuery(\n  $repositoryUrl: String!\n) {\n  GithubSkillBranches(repositoryUrl: $repositoryUrl) {\n    commitSha\n    isDefault\n    name\n    repository\n  }\n}\n"
  }
};
})();

(node as any).hash = "2d9a8d92efa279d78b4f3aa4f228284f";

export default node;
