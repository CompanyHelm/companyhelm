/**
 * @generated SignedSource<<4dbf2519ced794bdbabce92e0c059952>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type agentsPageNameSuggestionQuery$variables = Record<PropertyKey, never>;
export type agentsPageNameSuggestionQuery$data = {
  readonly suggestAgentName: {
    readonly name: string;
    readonly title: string;
  };
};
export type agentsPageNameSuggestionQuery = {
  response: agentsPageNameSuggestionQuery$data;
  variables: agentsPageNameSuggestionQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "AgentNameSuggestion",
    "kind": "LinkedField",
    "name": "suggestAgentName",
    "plural": false,
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
        "name": "title",
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
    "name": "agentsPageNameSuggestionQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "agentsPageNameSuggestionQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "83be59428cc5845d5b6705ba4420c865",
    "id": null,
    "metadata": {},
    "name": "agentsPageNameSuggestionQuery",
    "operationKind": "query",
    "text": "query agentsPageNameSuggestionQuery {\n  suggestAgentName {\n    name\n    title\n  }\n}\n"
  }
};
})();

(node as any).hash = "070128869d6e500a92d581e632823cd4";

export default node;
