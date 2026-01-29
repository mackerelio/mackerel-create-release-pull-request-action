import { ExecOptions } from "@actions/exec";
import { Endpoints } from "@octokit/types";
import _Ajv, { JSONSchemaType } from "ajv";
import { PullRequestInfo } from "./collectRepositoryInfo";

const Ajv = _Ajv as unknown as typeof _Ajv.default;

function buildPRContent(prs: readonly PullRequestInfo[]): string {
  let body = "";
  for (const pr of prs) {
    body += `- ${pr.title} #${pr.number}\n`;
  }
  return body;
}

const schema: JSONSchemaType<PullRequestInfo[]> = {
  type: "array",
  items: {
    type: "object",
    properties: {
      number: { type: "integer" },
      title: { type: "string" },
      authorName: { type: "string" },
      url: { type: "string" },
    },
    required: ["number", "title", "authorName", "url"],
  },
};

type FinishParams = Readonly<{
  owner: string;
  repo: string;
  base: string;
  branchName: string;
  nextVersion: string;
  inputPullRequestInfos: string;
  exec: (commandLine: string, args?: string[], options?: ExecOptions) => Promise<number>;
}>;

export async function finish(params: FinishParams): Promise<{
  head: string;
  base: string;
  title: string;
  body: string;
}> {
  const exec = params.exec;

  const pullRequestInfos: PullRequestInfo[] = JSON.parse(params.inputPullRequestInfos || "[]");
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  if (!validate(pullRequestInfos)) {
    return Promise.reject(new Error(`inputPullRequestInfos is invalid.`));
  }

  await exec("git", ["add", "."]);

  const message = `ready for next release and update changelogs. version: ${params.nextVersion}`;
  const title = `Release version ${params.nextVersion}`;
  const body = buildPRContent(pullRequestInfos);

  await exec("git", ["commit", "-m", message]);
  return {
    head: `${params.owner}:${params.branchName}`,
    base: params.base,
    body,
    title,
  };
}

type PullsCreateParams = Endpoints["POST /repos/{owner}/{repo}/pulls"]["parameters"];
export type PullsCreateResponse = Endpoints["POST /repos/{owner}/{repo}/pulls"]["response"];

type SendParams = Readonly<{
  pullsCreateParams: PullsCreateParams;
  branchName: string;
  exec: (commandLine: string, args?: string[], options?: ExecOptions) => Promise<number>;
  create: (params: PullsCreateParams) => Promise<PullsCreateResponse>;
}>;

export async function send(params: SendParams): Promise<void> {
  await params.exec("git", ["push", "origin", params.branchName]);
  await params.create(params.pullsCreateParams);
}
