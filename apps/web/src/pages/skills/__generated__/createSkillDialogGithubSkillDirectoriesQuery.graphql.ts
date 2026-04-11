/**
 * @generated SignedSource<<5d1f0ee6b61049e52bd1d13b7f91118a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type createSkillDialogGithubSkillDirectoriesQuery$variables = {
  repositoryUrl: string;
};
export type createSkillDialogGithubSkillDirectoriesQuery$data = {
  readonly GithubSkillDirectories: ReadonlyArray<{
    readonly fileList: ReadonlyArray<string>;
    readonly name: string;
    readonly path: string;
  }>;
};
export type createSkillDialogGithubSkillDirectoriesQuery = {
  response: createSkillDialogGithubSkillDirectoriesQuery$data;
  variables: createSkillDialogGithubSkillDirectoriesQuery$variables;
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
    "concreteType": "GithubSkillDirectory",
    "kind": "LinkedField",
    "name": "GithubSkillDirectories",
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
        "name": "path",
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
    "name": "createSkillDialogGithubSkillDirectoriesQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "createSkillDialogGithubSkillDirectoriesQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "d39f2f8cf0ca389f08bd596f294cfddb",
    "id": null,
    "metadata": {},
    "name": "createSkillDialogGithubSkillDirectoriesQuery",
    "operationKind": "query",
    "text": "query createSkillDialogGithubSkillDirectoriesQuery(\n  $repositoryUrl: String!\n) {\n  GithubSkillDirectories(repositoryUrl: $repositoryUrl) {\n    name\n    path\n    fileList\n  }\n}\n"
  }
};
})();

(node as any).hash = "391c9740396de104306c8a32b3385b70";

export default node;
