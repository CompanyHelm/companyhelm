/**
 * @generated SignedSource<<manual-fallback>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type createSkillDialogGithubDiscoveredSkillsQuery$variables = {
  branchName: string;
  repositoryUrl: string;
};
export type createSkillDialogGithubDiscoveredSkillsQuery$data = {
  readonly GithubDiscoveredSkills: ReadonlyArray<{
    readonly branchName: string;
    readonly commitSha: string;
    readonly description: string | null | undefined;
    readonly fileList: ReadonlyArray<string>;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string;
    readonly skillDirectory: string;
  }>;
};
export type createSkillDialogGithubDiscoveredSkillsQuery = {
  response: createSkillDialogGithubDiscoveredSkillsQuery$data;
  variables: createSkillDialogGithubDiscoveredSkillsQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "repositoryUrl"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "branchName"
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "repositoryUrl",
    "variableName": "repositoryUrl"
  },
  {
    "kind": "Variable",
    "name": "branchName",
    "variableName": "branchName"
  }
],
v2 = [
  {
    "alias": null,
    "args": (v1/*: any*/),
    "concreteType": "GithubDiscoveredSkill",
    "kind": "LinkedField",
    "name": "GithubDiscoveredSkills",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "branchName",
        "storageKey": null
      },
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
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "fileList",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "instructions",
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "skillDirectory",
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
    "name": "createSkillDialogGithubDiscoveredSkillsQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "createSkillDialogGithubDiscoveredSkillsQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "manual-createSkillDialogGithubDiscoveredSkillsQuery",
    "id": null,
    "metadata": {},
    "name": "createSkillDialogGithubDiscoveredSkillsQuery",
    "operationKind": "query",
    "text": "query createSkillDialogGithubDiscoveredSkillsQuery(\n  $repositoryUrl: String!\n  $branchName: String!\n) {\n  GithubDiscoveredSkills(repositoryUrl: $repositoryUrl, branchName: $branchName) {\n    branchName\n    commitSha\n    description\n    fileList\n    instructions\n    name\n    repository\n    skillDirectory\n  }\n}\n"
  }
};
})();

(node as any).hash = "manual-createSkillDialogGithubDiscoveredSkillsQuery";

export default node;
