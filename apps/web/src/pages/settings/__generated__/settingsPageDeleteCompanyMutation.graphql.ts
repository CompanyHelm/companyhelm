/**
 * @generated SignedSource<<76ed6e1defe713ba4576d65991ed520a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanyDeletionRequestStatus = "completed" | "failed" | "processing" | "requested" | "%future added value";
export type DeleteCompanyInput = {
  confirmationName: string;
};
export type settingsPageDeleteCompanyMutation$variables = {
  input: DeleteCompanyInput;
};
export type settingsPageDeleteCompanyMutation$data = {
  readonly DeleteCompany: {
    readonly companyId: string;
    readonly companyName: string;
    readonly completedAt: string | null | undefined;
    readonly id: string;
    readonly lastError: string | null | undefined;
    readonly requestedAt: string;
    readonly status: CompanyDeletionRequestStatus;
  };
};
export type settingsPageDeleteCompanyMutation = {
  response: settingsPageDeleteCompanyMutation$data;
  variables: settingsPageDeleteCompanyMutation$variables;
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
    "concreteType": "CompanyDeletionRequest",
    "kind": "LinkedField",
    "name": "DeleteCompany",
    "plural": false,
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
        "name": "companyId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "companyName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "requestedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "completedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastError",
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
    "name": "settingsPageDeleteCompanyMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "settingsPageDeleteCompanyMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "713bf656f3798af79de0c2bde52b61cd",
    "id": null,
    "metadata": {},
    "name": "settingsPageDeleteCompanyMutation",
    "operationKind": "mutation",
    "text": "mutation settingsPageDeleteCompanyMutation(\n  $input: DeleteCompanyInput!\n) {\n  DeleteCompany(input: $input) {\n    id\n    companyId\n    companyName\n    status\n    requestedAt\n    completedAt\n    lastError\n  }\n}\n"
  }
};
})();

(node as any).hash = "aeb33bc995787eb593831b01bf22512d";

export default node;
