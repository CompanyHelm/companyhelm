/**
 * @generated SignedSource<<51919c8b6ff953d1a505774bd94fc81d>>
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
export type knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation$variables = {
  input: UpdateExternalLinkArtifactInput;
};
export type knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation$data = {
  readonly UpdateExternalLinkArtifact: {
    readonly id: string;
    readonly updatedAt: string;
    readonly url: string | null | undefined;
  };
};
export type knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation = {
  response: knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation$data;
  variables: knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation$variables;
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
    "name": "knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "eaf52a9818980631948b3ff8fbd60fa8",
    "id": null,
    "metadata": {},
    "name": "knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation",
    "operationKind": "mutation",
    "text": "mutation knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation(\n  $input: UpdateExternalLinkArtifactInput!\n) {\n  UpdateExternalLinkArtifact(input: $input) {\n    id\n    url\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "e83d321a41baf023b861e833159a621c";

export default node;
