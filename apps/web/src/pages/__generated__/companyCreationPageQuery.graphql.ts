/**
 * @generated SignedSource<<ca947d88e444bd595b814320e43c06c4>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type companyCreationPageQuery$variables = Record<PropertyKey, never>;
export type companyCreationPageQuery$data = {
  readonly FreeCompanyCreationEligibility: {
    readonly allowed: boolean;
    readonly currentFreeCompanyCount: number;
    readonly limit: number;
    readonly reason: string | null | undefined;
  };
};
export type companyCreationPageQuery = {
  response: companyCreationPageQuery$data;
  variables: companyCreationPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "FreeCompanyCreationEligibility",
    "kind": "LinkedField",
    "name": "FreeCompanyCreationEligibility",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "allowed",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "currentFreeCompanyCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "limit",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reason",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "companyCreationPageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "companyCreationPageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "6d04fcd4b9671e3441b17e6b482f4d58",
    "id": null,
    "metadata": {},
    "name": "companyCreationPageQuery",
    "operationKind": "query",
    "text": "query companyCreationPageQuery {\n  FreeCompanyCreationEligibility {\n    allowed\n    currentFreeCompanyCount\n    limit\n    reason\n  }\n}\n"
  }
};
})();

(node as any).hash = "a7dd537db0eaee9675b462f001aba06b";

export default node;
