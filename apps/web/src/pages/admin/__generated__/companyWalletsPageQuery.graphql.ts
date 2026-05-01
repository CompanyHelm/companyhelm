/**
 * @generated SignedSource<<70c44c4ee45244bbf1645efd11c72d2c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CompanySubscriptionPlan = "free" | "pro" | "%future added value";
export type companyWalletsPageQuery$variables = {
  companyId: string;
};
export type companyWalletsPageQuery$data = {
  readonly PlatformAdminCompany: {
    readonly id: string;
    readonly name: string;
    readonly plan: CompanySubscriptionPlan;
    readonly slug: string | null | undefined;
  };
  readonly PlatformAdminCompanyWallets: ReadonlyArray<{
    readonly amountNanoUsd: number;
    readonly companyId: string;
    readonly createdAt: string;
    readonly id: string;
    readonly transactionCount: number;
    readonly type: string;
    readonly updatedAt: string;
  }>;
};
export type companyWalletsPageQuery = {
  response: companyWalletsPageQuery$data;
  variables: companyWalletsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "companyId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "companyId"
      }
    ],
    "concreteType": "PlatformAdminCompanyDetail",
    "kind": "LinkedField",
    "name": "PlatformAdminCompany",
    "plural": false,
    "selections": [
      (v1/*: any*/),
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
        "name": "slug",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "plan",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "companyId",
        "variableName": "companyId"
      }
    ],
    "concreteType": "PlatformAdminCompanyWallet",
    "kind": "LinkedField",
    "name": "PlatformAdminCompanyWallets",
    "plural": true,
    "selections": [
      (v1/*: any*/),
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
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "amountNanoUsd",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "transactionCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
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
    "name": "companyWalletsPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "companyWalletsPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "fed1c903261bf7f5a12bccd481329d4a",
    "id": null,
    "metadata": {},
    "name": "companyWalletsPageQuery",
    "operationKind": "query",
    "text": "query companyWalletsPageQuery(\n  $companyId: ID!\n) {\n  PlatformAdminCompany(id: $companyId) {\n    id\n    name\n    slug\n    plan\n  }\n  PlatformAdminCompanyWallets(companyId: $companyId) {\n    id\n    companyId\n    type\n    amountNanoUsd\n    transactionCount\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "68eb72715c9b96312c142c4bf4585d9f";

export default node;
