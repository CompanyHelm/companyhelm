/**
 * @generated
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

export type createSkillDialogGithubDiscoveredSkillsQuery$variables = {
  branchName: string;
  repositoryUrl: string;
};

export type createSkillDialogGithubDiscoveredSkillsQuery$data = {
  readonly GithubDiscoveredSkills: ReadonlyArray<{
    readonly branchName: string;
    readonly commitSha: string;
    readonly description: string | null | undefined;
    readonly fileList: ReadonlyArray<string>;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string;
    readonly skillDirectory: string;
  }>;
};

export type createSkillDialogGithubDiscoveredSkillsQuery = {
  response: createSkillDialogGithubDiscoveredSkillsQuery$data;
  variables: createSkillDialogGithubDiscoveredSkillsQuery$variables;
};
