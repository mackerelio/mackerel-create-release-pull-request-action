import { ExecOptions } from "@actions/exec";
import * as github from "@actions/github";
import semver from "semver";

export type PullRequestInfo = {
  number: number;
  title: string;
  authorName: string;
  url: string;
};

// Get merged PRs between 'base' and 'head'
// https://github.com/Songmu/ghch/blob/c1a140de3b1cf5e65a895d28b45f36a2dca0a8b6/ghch.go#L242
export async function mergedPullRequests(params: {
  token: string;
  owner: string;
  repo: string;
  base: string;
  head: string;
}): Promise<PullRequestInfo[]> {
  const octokit = github.getOctokit(params.token);

  // Get commits between 'base' and 'head'
  const response = await octokit.rest.repos.compareCommits({
    owner: params.owner,
    repo: params.repo,
    base: params.base,
    head: params.head,
  });

  const results: PullRequestInfo[] = [];

  for (const { commit } of response.data.commits) {
    // Check if the commit is a merge commit
    const matched = /^Merge pull request #([0-9]+) from (\S+)/.exec(commit.message);
    if (!matched) {
      continue;
    }

    const prNumber = parseInt(matched[1], 10);
    const branchName = matched[2];
    // Request the PR detail using the PR number
    const { data } = await octokit.rest.pulls.get({
      owner: params.owner,
      repo: params.repo,
      pull_number: prNumber,
    });

    // https://github.com/Songmu/ghch/blob/c1a140de3b1cf5e65a895d28b45f36a2dca0a8b6/ghch.go#L265-L268
    if (data.head.label.replace(":", "/") !== branchName) {
      continue;
    }

    // Exclude nit PRs
    if (/\[nitp?\]/i.test(data.title)) {
      continue;
    }

    const authorName = data.user?.login ?? "";
    results.push({
      number: data.number,
      title: data.title,
      url: data.html_url,
      authorName,
    });
  }

  return results.sort((a, b) => b.number - a.number);
}

export async function getLatestReleaseVersion(params: {
  token: string;
  owner: string;
  repo: string;
}): Promise<string | null> {
  const octokit = github.getOctokit(params.token);
  const response = await octokit.rest.repos.getLatestRelease({
    owner: params.owner,
    repo: params.repo,
  });
  const tagName = response.data["tag_name"];
  return semver.valid(semver.coerce(tagName));
}

// use overridesOwnerAndRepo when debug and test.
export function getOwnerAndRepo(
  overridesOwnerAndRepo?: string
): Readonly<{ owner: string; repo: string }> {
  if (!overridesOwnerAndRepo) {
    return github.context.repo;
  }

  if (!overridesOwnerAndRepo.includes("/")) {
    throw new Error(
      `overridesOwnerAndRepo='${overridesOwnerAndRepo}' was not in a correct format; expected format {org}/{repo}.`
    );
  }

  const [owner, repo] = overridesOwnerAndRepo.split("/");
  return { owner, repo };
}

type CaptureCommandStdoutParams = Readonly<{
  exec: (commandLine: string, args?: string[], options?: ExecOptions) => Promise<number>;
  commandLine: string;
  args: string[] | undefined;
}>;

export async function captureCommandStdout(params: CaptureCommandStdoutParams): Promise<string> {
  let output = "";
  const options: ExecOptions = {};
  options.listeners = {
    stdout: data => {
      output += data.toString();
    },
  };

  await params.exec(params.commandLine, params.args, options);
  return output;
}

type GitDiffParams = Readonly<{
  exec: (commandLine: string, args?: string[], options?: ExecOptions) => Promise<number>;
  base: string;
  head: string;
  captureCommandStdout: (params: CaptureCommandStdoutParams) => Promise<string>;
}>;

export async function gitDiff(params: GitDiffParams): Promise<string> {
  return await params.captureCommandStdout({
    exec: params.exec,
    commandLine: "git",
    args: ["diff", "--word-diff", `${params.base}..${params.head}`],
  });
}
