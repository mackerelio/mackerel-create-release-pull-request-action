import { ExecOptions } from "@actions/exec";
import semver from "semver";
import { PullRequestInfo } from "./collectRepositoryInfo";

export function validateNextVersion(currentVersion: string, nextVersion: string): void {
  if (!/^(\d+\.\d+\.\d+)$/.test(nextVersion)) {
    throw new Error(`${nextVersion} is not expected format`);
  }
  if (semver.lte(nextVersion, currentVersion)) {
    throw new Error(`${nextVersion} is smaller than current version ${currentVersion}`);
  }
}

type Params = Readonly<{
  token: string;
  owner: string;
  repo: string;
  nextVersion: string;
  getLatestReleaseVersion: (params: {
    token: string;
    owner: string;
    repo: string;
  }) => Promise<string | null>;
  mergedPullRequests: (params: {
    token: string;
    owner: string;
    repo: string;
    base: string;
    head: string;
  }) => Promise<PullRequestInfo[]>;
  setOutput: (name: string, value: string) => void;
  exec: (commandLine: string, args?: string[], options?: ExecOptions) => Promise<number>;
}>;

export async function start(params: Params): Promise<{
  nextVersion: string;
  pullRequestInfos: PullRequestInfo[];
}> {
  const currentVersion = await params.getLatestReleaseVersion({
    token: params.token,
    owner: params.owner,
    repo: params.repo,
  });

  if (currentVersion === null) {
    return Promise.reject(new Error("can't get currentVersion"));
  }
  const nextVersion = params.nextVersion;
  validateNextVersion(currentVersion, nextVersion);

  const pullRequestInfos = await params.mergedPullRequests({
    token: params.token,
    owner: params.owner,
    repo: params.repo,
    base: `v${currentVersion}`,
    head: "HEAD",
  });

  const branchName = `bump-version-${nextVersion}`;

  params.setOutput("currentVersion", currentVersion);
  params.setOutput("nextVersion", nextVersion);
  params.setOutput("pullRequestInfos", JSON.stringify(pullRequestInfos));
  params.setOutput("branchName", branchName);

  await params.exec("git", ["switch", "-c", branchName]);

  return {
    nextVersion,
    pullRequestInfos,
  };
}
