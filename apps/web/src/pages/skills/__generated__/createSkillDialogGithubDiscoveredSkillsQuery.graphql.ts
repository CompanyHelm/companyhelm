/**
 * @generated SignedSource<<798fa9b8b6879373020ad8242461fa55>>
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
export type createSkillDialogGithubDiscoveredSkillsQuery$variables = {
  branchName: string;
  source: GitSkillSourceInput;
};
export type createSkillDialogGithubDiscoveredSkillsQuery$data = {
  readonly GithubDiscoveredSkills: ReadonlyArray<{
    readonly name: string;
    readonly skillDirectory: string;
    readonly trackedFileCount: number;
  }>;
};
export type createSkillDialogGithubDiscoveredSkillsQuery = {
  response: createSkillDialogGithubDiscoveredSkillsQuery$data;
  variables: createSkillDialogGithubDiscoveredSkillsQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "branchName"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "source"
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "branchName",
        "variableName": "branchName"
      },
      {
        "kind": "Variable",
        "name": "source",
        "variableName": "source"
      }
    ],
    "concreteType": "GithubDiscoveredSkill",
    "kind": "LinkedField",
    "name": "GithubDiscoveredSkills",
    "plural": true,
    "selections": [
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
        "name": "skillDirectory",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "trackedFileCount",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "createSkillDialogGithubDiscoveredSkillsQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "createSkillDialogGithubDiscoveredSkillsQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "212b3727ff9d2372271af8dc7febf955",
    "id": null,
    "metadata": {},
    "name": "createSkillDialogGithubDiscoveredSkillsQuery",
    "operationKind": "query",
    "text": "query createSkillDialogGithubDiscoveredSkillsQuery(\n  $source: GitSkillSourceInput!\n  $branchName: String!\n) {\n  GithubDiscoveredSkills(source: $source, branchName: $branchName) {\n    name\n    skillDirectory\n    trackedFileCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "cb40def83c16996397364908ee72f7c3";

export default node;
