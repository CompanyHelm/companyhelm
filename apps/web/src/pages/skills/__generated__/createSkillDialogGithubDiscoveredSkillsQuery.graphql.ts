/**
 * @generated SignedSource<<41806afbaedf9356a60a82af4ebf432b>>
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
  "name": "repositoryUrl"
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
        "name": "repositoryUrl",
        "variableName": "repositoryUrl"
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
    "cacheID": "9b0073219ff2044346b25b7d3c3558f0",
    "id": null,
    "metadata": {},
    "name": "createSkillDialogGithubDiscoveredSkillsQuery",
    "operationKind": "query",
    "text": "query createSkillDialogGithubDiscoveredSkillsQuery(\n  $repositoryUrl: String!\n  $branchName: String!\n) {\n  GithubDiscoveredSkills(repositoryUrl: $repositoryUrl, branchName: $branchName) {\n    name\n    skillDirectory\n    trackedFileCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "a2e6c666c90f3555f80eba15e56414e5";

export default node;
