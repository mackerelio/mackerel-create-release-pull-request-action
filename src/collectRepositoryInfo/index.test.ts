import { exec } from "@actions/exec";
import { context } from "@actions/github";
import {
  mergedPullRequests,
  getLatestReleaseVersion,
  getOwnerAndRepo,
  gitDiff,
  captureCommandStdout,
} from ".";

const token =
  process.env["INPUT_GITHUB_TOKEN"] === undefined ? "" : process.env["INPUT_GITHUB_TOKEN"];

describe("mergedPullRequests", () => {
  it("can get detail of merged pull requests", async () => {
    const actual = await mergedPullRequests({
      token,
      owner: "mackerelio",
      repo: "mkr",
      base: "v0.42.0",
      head: "v0.43.0",
    });

    expect(actual).toEqual([
      {
        authorName: "mackerelbot",
        number: 343,
        title: "Release version 0.43.0",
        url: "https://github.com/mackerelio/mkr/pull/343",
      },
      {
        authorName: "dependabot[bot]",
        number: 342,
        title: "Bump github.com/mackerelio/mackerel-agent from 0.70.2 to 0.71.0",
        url: "https://github.com/mackerelio/mkr/pull/342",
      },
      {
        authorName: "dependabot[bot]",
        number: 341,
        title: "Bump alpine from 3.12.1 to 3.12.2",
        url: "https://github.com/mackerelio/mkr/pull/341",
      },
      {
        authorName: "lufia",
        number: 339,
        title: "migrate to GitHub Actions",
        url: "https://github.com/mackerelio/mkr/pull/339",
      },
      {
        authorName: "dependabot[bot]",
        number: 338,
        title: "Bump gopkg.in/yaml.v2 from 2.3.0 to 2.4.0",
        url: "https://github.com/mackerelio/mkr/pull/338",
      },
      {
        authorName: "dependabot-preview[bot]",
        number: 330,
        title: "Bump github.com/fatih/color from 1.9.0 to 1.10.0",
        url: "https://github.com/mackerelio/mkr/pull/330",
      },
    ]);
  });
});

describe("getLatestReleaseVersion", () => {
  it("can get latest release version", async () => {
    const version = await getLatestReleaseVersion({
      token,
      owner: "mackerelio",
      repo: "mkr",
    });

    expect(version).toEqual(expect.stringMatching(/^\d+(\.\d+){2}$/));
  });
});

describe("getOwnerAndRepo", () => {
  beforeEach(() => {
    /*
    This environment variable is needed to use `github.context.repo`

    In the GitHub Actions environment, the environment variable is given by
    GitHub Actions and cannot be overwritten.
    set the environment variable when not exists it at running environment.
    */
    if (process.env["GITHUB_REPOSITORY"] === undefined) {
      process.env["GITHUB_REPOSITORY"] = "foo/bar";
    }
  });
  it("can get owner and repo", () => {
    expect(getOwnerAndRepo()).toEqual(context.repo);
  });
  it("can get owner and repo when empty string", () => {
    expect(getOwnerAndRepo("")).toEqual(context.repo);
  });
  it("throw error when invalid overridesOwnerAndRepo", () => {
    expect(() => {
      getOwnerAndRepo("bazqux");
    }).toThrow(
      "overridesOwnerAndRepo='bazqux' was not in a correct format; expected format {org}/{repo}."
    );
  });
  it("can set custom owner and repo", () => {
    expect(getOwnerAndRepo("baz/qux")).toEqual({ owner: "baz", repo: "qux" });
  });
});

describe("captureCommandStdout", () => {
  test("can capture the stdout when the command is executed", async () => {
    expect(await captureCommandStdout({ exec, commandLine: "echo", args: ["aaa\naaa"] })).toEqual(
      ["aaa", "aaa", ""].join("\n")
    );
  });
  test("get throw when cant exec", async () => {
    const exec = jest.fn(() => Promise.reject(new Error("failed")));

    await expect(
      captureCommandStdout({ exec, commandLine: "echo", args: ["aaa"] })
    ).rejects.toThrow("failed");
  });
  test("arguments are passed to exec", async () => {
    const exec = jest.fn(() => Promise.resolve(0));

    await captureCommandStdout({ exec, commandLine: "echo", args: ["foo", "bar", "baz"] });
    expect(exec).toHaveBeenCalledWith("echo", ["foo", "bar", "baz"], {
      listeners: { stdout: expect.any(Function) },
    });
  });
});

describe("gitDiff", () => {
  test("can output base and head diffs", async () => {
    const exec = jest.fn(() => Promise.resolve(0));

    await gitDiff({ exec, captureCommandStdout, base: "base", head: "head" });
    expect(exec).toHaveBeenCalledWith("git", ["diff", "--word-diff", "base..head"], {
      listeners: { stdout: expect.any(Function) },
    });
  });
});
