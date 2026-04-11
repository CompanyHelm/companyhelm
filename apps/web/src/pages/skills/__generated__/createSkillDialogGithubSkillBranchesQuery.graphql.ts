/**
 * @generated
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

export type createSkillDialogGithubSkillBranchesQuery$variables = {
  repositoryUrl: string;
};

export type createSkillDialogGithubSkillBranchesQuery$data = {
  readonly GithubSkillBranches: ReadonlyArray<{
    readonly commitSha: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly repository: string;
  }>;
};

export type createSkillDialogGithubSkillBranchesQuery = {
  response: createSkillDialogGithubSkillBranchesQuery$data;
  variables: createSkillDialogGithubSkillBranchesQuery$variables;
};
