/**
 * @generated SignedSource<<6fb699e27f118c7f61c5ebd6cca35f18>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ImportGithubSkillsInput = {
  skillGroupId?: string | null | undefined;
  skills: ReadonlyArray<ImportGithubSkillRecordInput>;
};
export type ImportGithubSkillRecordInput = {
  branchName: string;
  repository: string;
  skillDirectory: string;
};
export type skillsPageImportGithubSkillsMutation$variables = {
  input: ImportGithubSkillsInput;
};
export type skillsPageImportGithubSkillsMutation$data = {
  readonly ImportGithubSkills: ReadonlyArray<{
    readonly description: string;
    readonly fileList: ReadonlyArray<string>;
    readonly id: string;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string | null | undefined;
    readonly skillDirectory: string | null | undefined;
    readonly skillGroupId: string | null | undefined;
  }>;
};
export type skillsPageImportGithubSkillsMutation = {
  response: skillsPageImportGithubSkillsMutation$data;
  variables: skillsPageImportGithubSkillsMutation$variables;
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
    "concreteType": "Skill",
    "kind": "LinkedField",
    "name": "ImportGithubSkills",
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
        "name": "name",
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
        "name": "instructions",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "skillGroupId",
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "fileList",
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
    "name": "skillsPageImportGithubSkillsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "skillsPageImportGithubSkillsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "697a8718663e3db1d1b9761d98bdf918",
    "id": null,
    "metadata": {},
    "name": "skillsPageImportGithubSkillsMutation",
    "operationKind": "mutation",
    "text": "mutation skillsPageImportGithubSkillsMutation(\n  $input: ImportGithubSkillsInput!\n) {\n  ImportGithubSkills(input: $input) {\n    id\n    name\n    description\n    instructions\n    skillGroupId\n    repository\n    skillDirectory\n    fileList\n  }\n}\n"
  }
};
})();

(node as any).hash = "9a519d939ed0e3b388762d4620176d94";

export default node;
