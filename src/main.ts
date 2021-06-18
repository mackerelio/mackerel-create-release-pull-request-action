import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import {
  captureCommandStdout,
  getLatestReleaseVersion,
  mergedPullRequests,
  getOwnerAndRepo,
  gitDiff,
  PullRequestInfo,
} from "./collectRepositoryInfo";
import { finish, send } from "./finish";
import { start } from "./start";
import {
  bumpVersionGo,
  bumpMakefile,
  updateDebPackageChangelog,
  updateRpmPackageChangelog,
  updateMarkdownChangelog,
  validatePackageName,
} from "./updateFiles";

async function updateFiles(params: {
  nextVersion: string;
  pullRequestInfos: PullRequestInfo[];
  packageName: string;
  versionGoFilePath: string;
}): Promise<void> {
  const now = new Date();

  await bumpVersionGo(params.versionGoFilePath, params.nextVersion);
  await bumpMakefile("Makefile", params.nextVersion);
  await updateDebPackageChangelog(
    "packaging/deb*/debian/changelog",
    now,
    params.packageName,
    params.nextVersion,
    params.pullRequestInfos
  );
  await updateRpmPackageChangelog(
    `packaging/rpm/${params.packageName}*.spec`,
    now,
    params.nextVersion,
    params.pullRequestInfos
  );
  await updateMarkdownChangelog("CHANGELOG.md", now, params.nextVersion, params.pullRequestInfos);
}

async function run(): Promise<void> {
  try {
    const token = core.getInput("github_token");

    // chdir to the path where the repository exists when debug.
    const debugCloneDirectoryPath = core.getInput("debug_clone_directory_path");
    if (debugCloneDirectoryPath) {
      process.chdir(debugCloneDirectoryPath);
    }

    // can override github.context.repo when debug.
    const debugGitHubRepository = core.getInput("debug_github_repository");
    const { owner, repo } = getOwnerAndRepo(debugGitHubRepository);

    const finished = core.getInput("finished");

    if (finished === "false") {
      const packageName = core.getInput("package_name");
      validatePackageName(packageName);
      const { nextVersion, pullRequestInfos } = await start({
        token,
        owner,
        repo,
        nextVersion: core.getInput("next_version"),
        getLatestReleaseVersion,
        mergedPullRequests,
        setOutput: core.setOutput,
        exec: exec.exec,
      });
      // The nextVersion already was validated in start()
      await updateFiles({
        nextVersion,
        pullRequestInfos,
        versionGoFilePath: core.getInput("version_go_file_path"),
        packageName,
      });
    } else if (finished === "true") {
      const nextVersion = core.getInput("next_version");
      const branchName = core.getInput("branch_name");
      const inputPullRequestInfos = core.getInput("pull_request_infos");

      const createPullRequestPayload = await finish({
        owner,
        repo,
        base: "master",
        nextVersion,
        branchName,
        inputPullRequestInfos,
        exec: exec.exec,
      });
      core.startGroup("Information on the created Pull Request");
      core.info(createPullRequestPayload.title);
      core.info(createPullRequestPayload.body);
      core.endGroup();
      core.startGroup("git diff");
      core.info(
        await gitDiff({
          exec: exec.exec,
          captureCommandStdout,
          base: "origin/master",
          head: "HEAD",
        })
      );
      core.endGroup();

      if (!core.isDebug()) {
        const octokit = github.getOctokit(token);
        await send({
          pullsCreateParams: { ...createPullRequestPayload, owner, repo },
          branchName,
          exec: exec.exec,
          create: octokit.rest.pulls.create,
        });
      }
    } else {
      throw new Error(`finished: ${finished} is invalid.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
