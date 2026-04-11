/**
 * @generated SignedSource<<324c81037d71e90a662ce679c3e6e96d>>
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
    "cacheID": "5278a2a4cfdf26267339513542614cf1",
    "id": null,
    "metadata": {},
    "name": "createSkillDialogGithubDiscoveredSkillsQuery",
    "operationKind": "query",
    "text": "query createSkillDialogGithubDiscoveredSkillsQuery(\n  $repositoryUrl: String!\n  $branchName: String!\n) {\n  GithubDiscoveredSkills(repositoryUrl: $repositoryUrl, branchName: $branchName) {\n    branchName\n    commitSha\n    description\n    fileList\n    instructions\n    name\n    repository\n    skillDirectory\n  }\n}\n"
  }
};
})();

(node as any).hash = "a2ef417e80e045ac6725f147e130f6ff";

export default node;
