/**
 * @generated SignedSource<<de6208b33f5c2c9a2446a966207124dc>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateCompanySettingsInput = {
  baseSystemPrompt?: string | null | undefined;
  defaultManagedPlatformModelId?: string | null | undefined;
};
export type credentialDetailPageUpdateCompanySettingsMutation$variables = {
  input: UpdateCompanySettingsInput;
};
export type credentialDetailPageUpdateCompanySettingsMutation$data = {
  readonly UpdateCompanySettings: {
    readonly baseSystemPrompt: string | null | undefined;
    readonly companyId: string;
    readonly defaultManagedPlatformModelId: string | null | undefined;
  };
};
export type credentialDetailPageUpdateCompanySettingsMutation = {
  response: credentialDetailPageUpdateCompanySettingsMutation$data;
  variables: credentialDetailPageUpdateCompanySettingsMutation$variables;
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
    "concreteType": "CompanySettings",
    "kind": "LinkedField",
    "name": "UpdateCompanySettings",
    "plural": false,
    "selections": [
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
        "name": "baseSystemPrompt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultManagedPlatformModelId",
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
    "name": "credentialDetailPageUpdateCompanySettingsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageUpdateCompanySettingsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "def0b1d25adf1c7bc39cc04870473394",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageUpdateCompanySettingsMutation",
    "operationKind": "mutation",
    "text": "mutation credentialDetailPageUpdateCompanySettingsMutation(\n  $input: UpdateCompanySettingsInput!\n) {\n  UpdateCompanySettings(input: $input) {\n    companyId\n    baseSystemPrompt\n    defaultManagedPlatformModelId\n  }\n}\n"
  }
};
})();

(node as any).hash = "4390684a60e285cc5acb2ada600fa7c5";

export default node;
