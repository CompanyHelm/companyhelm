/**
 * @generated
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

export type ImportGithubSkillRecordInput = {
  branchName: string;
  commitSha: string;
  description?: string | null | undefined;
  fileList: ReadonlyArray<string>;
  instructions: string;
  name: string;
  repository: string;
  skillDirectory: string;
};

export type ImportGithubSkillsInput = {
  skillGroupId?: string | null | undefined;
  skills: ReadonlyArray<ImportGithubSkillRecordInput>;
};

export type skillsPageImportGithubSkillsMutation$variables = {
  input: ImportGithubSkillsInput;
};

export type skillsPageImportGithubSkillsMutation$data = {
  readonly ImportGithubSkills: ReadonlyArray<{
    readonly description: string;
    readonly fileList: ReadonlyArray<string>;
    readonly id: string;
    readonly instructions: string;
    readonly name: string;
    readonly repository: string | null | undefined;
    readonly skillDirectory: string | null | undefined;
    readonly skillGroupId: string | null | undefined;
  }>;
};

export type skillsPageImportGithubSkillsMutation = {
  response: skillsPageImportGithubSkillsMutation$data;
  variables: skillsPageImportGithubSkillsMutation$variables;
};
