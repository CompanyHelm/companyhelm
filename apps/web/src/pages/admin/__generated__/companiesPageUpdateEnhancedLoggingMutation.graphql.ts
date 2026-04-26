/**
 * @generated SignedSource<<c70ac6c203e43c20de593aa04a023d4a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdatePlatformAdminCompanyEnhancedLoggingInput = {
  companyId: string;
  components?: ReadonlyArray<string> | null | undefined;
  enabled: boolean;
  sessionIds?: ReadonlyArray<string> | null | undefined;
  ttlSeconds?: number | null | undefined;
};
export type companiesPageUpdateEnhancedLoggingMutation$variables = {
  input: UpdatePlatformAdminCompanyEnhancedLoggingInput;
};
export type companiesPageUpdateEnhancedLoggingMutation$data = {
  readonly UpdatePlatformAdminCompanyEnhancedLogging: {
    readonly components: ReadonlyArray<string>;
    readonly enabled: boolean;
    readonly expiresAt: string | null | undefined;
    readonly sessionIds: ReadonlyArray<string>;
    readonly ttlSeconds: number | null | undefined;
  };
};
export type companiesPageUpdateEnhancedLoggingMutation = {
  response: companiesPageUpdateEnhancedLoggingMutation$data;
  variables: companiesPageUpdateEnhancedLoggingMutation$variables;
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
    "concreteType": "PlatformAdminCompanyEnhancedLogging",
    "kind": "LinkedField",
    "name": "UpdatePlatformAdminCompanyEnhancedLogging",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "enabled",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "expiresAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "ttlSeconds",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "components",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sessionIds",
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
    "name": "companiesPageUpdateEnhancedLoggingMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "companiesPageUpdateEnhancedLoggingMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "cbe0ae261573291df3bad68620f4e71f",
    "id": null,
    "metadata": {},
    "name": "companiesPageUpdateEnhancedLoggingMutation",
    "operationKind": "mutation",
    "text": "mutation companiesPageUpdateEnhancedLoggingMutation(\n  $input: UpdatePlatformAdminCompanyEnhancedLoggingInput!\n) {\n  UpdatePlatformAdminCompanyEnhancedLogging(input: $input) {\n    enabled\n    expiresAt\n    ttlSeconds\n    components\n    sessionIds\n  }\n}\n"
  }
};
})();

(node as any).hash = "60c2e914a748e9b889b55286d02d2605";

export default node;
