/**
 * @generated SignedSource<<d747d3ed160b18c3fc0c36efa73bafcd>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteGithubInstallationInput = {
  installationId: string;
};
export type repositoriesPageDeleteGithubInstallationMutation$variables = {
  input: DeleteGithubInstallationInput;
};
export type repositoriesPageDeleteGithubInstallationMutation$data = {
  readonly DeleteGithubInstallation: {
    readonly deletedInstallationId: string;
  };
};
export type repositoriesPageDeleteGithubInstallationMutation = {
  response: repositoriesPageDeleteGithubInstallationMutation$data;
  variables: repositoriesPageDeleteGithubInstallationMutation$variables;
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
    "concreteType": "DeleteGithubInstallationPayload",
    "kind": "LinkedField",
    "name": "DeleteGithubInstallation",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "deletedInstallationId",
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
    "name": "repositoriesPageDeleteGithubInstallationMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "repositoriesPageDeleteGithubInstallationMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b30c5073bfa9519856b91b524dc40f8c",
    "id": null,
    "metadata": {},
    "name": "repositoriesPageDeleteGithubInstallationMutation",
    "operationKind": "mutation",
    "text": "mutation repositoriesPageDeleteGithubInstallationMutation(\n  $input: DeleteGithubInstallationInput!\n) {\n  DeleteGithubInstallation(input: $input) {\n    deletedInstallationId\n  }\n}\n"
  }
};
})();

(node as any).hash = "7fa83371571caf6243f1c74248f76cc0";

export default node;
