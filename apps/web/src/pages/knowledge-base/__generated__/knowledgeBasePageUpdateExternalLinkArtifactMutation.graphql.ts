/**
 * @generated SignedSource<<aa1ab9ca6015559e67c685d3519d8de3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateExternalLinkArtifactInput = {
  id: string;
  url: string;
};
export type knowledgeBasePageUpdateExternalLinkArtifactMutation$variables = {
  input: UpdateExternalLinkArtifactInput;
};
export type knowledgeBasePageUpdateExternalLinkArtifactMutation$data = {
  readonly UpdateExternalLinkArtifact: {
    readonly id: string;
    readonly updatedAt: string;
    readonly url: string | null | undefined;
  };
};
export type knowledgeBasePageUpdateExternalLinkArtifactMutation = {
  response: knowledgeBasePageUpdateExternalLinkArtifactMutation$data;
  variables: knowledgeBasePageUpdateExternalLinkArtifactMutation$variables;
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
    "concreteType": "Artifact",
    "kind": "LinkedField",
    "name": "UpdateExternalLinkArtifact",
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
        "name": "url",
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
    "name": "knowledgeBasePageUpdateExternalLinkArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBasePageUpdateExternalLinkArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "6f1560f9b3fa59025889444fe30678e0",
    "id": null,
    "metadata": {},
    "name": "knowledgeBasePageUpdateExternalLinkArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBasePageUpdateExternalLinkArtifactMutation(\n  $input: UpdateExternalLinkArtifactInput!\n) {\n  UpdateExternalLinkArtifact(input: $input) {\n    id\n    url\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "9eaf6ab58319e94693d04a016f574e3c";

export default node;
