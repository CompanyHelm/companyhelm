/**
 * @generated SignedSource<<7f889fe6c282a2f8b6fbb2843308b7f8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SkillSourceType = "github_installation" | "manual" | "public_git" | "%future added value";
export type GitSkillSourceInput = {
  githubRepositoryId?: string | null | undefined;
  repository?: string | null | undefined;
  sourceType: SkillSourceType;
};
export type createSkillDialogGithubSkillBranchesQuery$variables = {
  source: GitSkillSourceInput;
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
    "name": "source"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "source",
        "variableName": "source"
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
    "cacheID": "290bd95461993e23b3a069967b172949",
    "id": null,
    "metadata": {},
    "name": "createSkillDialogGithubSkillBranchesQuery",
    "operationKind": "query",
    "text": "query createSkillDialogGithubSkillBranchesQuery(\n  $source: GitSkillSourceInput!\n) {\n  GithubSkillBranches(source: $source) {\n    commitSha\n    isDefault\n    name\n    repository\n  }\n}\n"
  }
};
})();

(node as any).hash = "44db9e24df561b343873048034d799a4";

export default node;
