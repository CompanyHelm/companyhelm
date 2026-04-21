/**
 * @generated SignedSource<<90e2e44ee77df14fcf8fbbbab321d737>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteGithubRepositoryProvisioningInput = {
  id: string;
};
export type repositoriesPageDeleteGithubRepositoryProvisioningMutation$variables = {
  input: DeleteGithubRepositoryProvisioningInput;
};
export type repositoriesPageDeleteGithubRepositoryProvisioningMutation$data = {
  readonly DeleteGithubRepositoryProvisioning: {
    readonly deletedProvisioningId: string;
  };
};
export type repositoriesPageDeleteGithubRepositoryProvisioningMutation = {
  response: repositoriesPageDeleteGithubRepositoryProvisioningMutation$data;
  variables: repositoriesPageDeleteGithubRepositoryProvisioningMutation$variables;
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
    "concreteType": "DeleteGithubRepositoryProvisioningPayload",
    "kind": "LinkedField",
    "name": "DeleteGithubRepositoryProvisioning",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "deletedProvisioningId",
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
    "name": "repositoriesPageDeleteGithubRepositoryProvisioningMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "repositoriesPageDeleteGithubRepositoryProvisioningMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b623cae1b0b16d707c50d894673dc4c4",
    "id": null,
    "metadata": {},
    "name": "repositoriesPageDeleteGithubRepositoryProvisioningMutation",
    "operationKind": "mutation",
    "text": "mutation repositoriesPageDeleteGithubRepositoryProvisioningMutation(\n  $input: DeleteGithubRepositoryProvisioningInput!\n) {\n  DeleteGithubRepositoryProvisioning(input: $input) {\n    deletedProvisioningId\n  }\n}\n"
  }
};
})();

(node as any).hash = "5dd81dda85273635405571883a90ced2";

export default node;
