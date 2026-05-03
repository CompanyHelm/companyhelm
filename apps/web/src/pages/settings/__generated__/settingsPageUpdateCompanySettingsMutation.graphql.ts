/**
 * @generated SignedSource<<88d1e2769281f93e4e22994673d2c92b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateCompanySettingsInput = {
  baseSystemPrompt?: string | null | undefined;
};
export type settingsPageUpdateCompanySettingsMutation$variables = {
  input: UpdateCompanySettingsInput;
};
export type settingsPageUpdateCompanySettingsMutation$data = {
  readonly UpdateCompanySettings: {
    readonly baseSystemPrompt: string | null | undefined;
    readonly companyId: string;
  };
};
export type settingsPageUpdateCompanySettingsMutation = {
  response: settingsPageUpdateCompanySettingsMutation$data;
  variables: settingsPageUpdateCompanySettingsMutation$variables;
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
    "name": "settingsPageUpdateCompanySettingsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "settingsPageUpdateCompanySettingsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "efb067d912dcdcfd0c573b535af07398",
    "id": null,
    "metadata": {},
    "name": "settingsPageUpdateCompanySettingsMutation",
    "operationKind": "mutation",
    "text": "mutation settingsPageUpdateCompanySettingsMutation(\n  $input: UpdateCompanySettingsInput!\n) {\n  UpdateCompanySettings(input: $input) {\n    companyId\n    baseSystemPrompt\n  }\n}\n"
  }
};
})();

(node as any).hash = "9aac3bb8ea2913fb16da09470fee36a7";

export default node;
