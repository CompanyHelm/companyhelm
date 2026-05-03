/**
 * @generated SignedSource<<0e4fc1da9bd3bea5ef4e08a9c2a5e558>>
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
export type agentDetailPageUpdateCompanySettingsMutation$variables = {
  input: UpdateCompanySettingsInput;
};
export type agentDetailPageUpdateCompanySettingsMutation$data = {
  readonly UpdateCompanySettings: {
    readonly baseSystemPrompt: string | null | undefined;
    readonly companyId: string;
  };
};
export type agentDetailPageUpdateCompanySettingsMutation = {
  response: agentDetailPageUpdateCompanySettingsMutation$data;
  variables: agentDetailPageUpdateCompanySettingsMutation$variables;
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
    "name": "agentDetailPageUpdateCompanySettingsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentDetailPageUpdateCompanySettingsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "3890aed3c322fcd23f9a015d929a7096",
    "id": null,
    "metadata": {},
    "name": "agentDetailPageUpdateCompanySettingsMutation",
    "operationKind": "mutation",
    "text": "mutation agentDetailPageUpdateCompanySettingsMutation(\n  $input: UpdateCompanySettingsInput!\n) {\n  UpdateCompanySettings(input: $input) {\n    companyId\n    baseSystemPrompt\n  }\n}\n"
  }
};
})();

(node as any).hash = "5b832c305f7037b1e79d0618773ce5f6";

export default node;
