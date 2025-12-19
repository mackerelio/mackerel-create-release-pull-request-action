import { PullRequestInfo } from "./collectRepositoryInfo";
import { start, validateNextVersion } from "./start";

const currentVersion = "0.50.0";

describe("validateNextVersion", () => {
  test.each(["foo", "v0.50.0", "0.50.0-foo"])(
    "error if next version is not expected format",
    version => {
      expect(() => {
        validateNextVersion(currentVersion, version);
      }).toThrow(`${version} is not expected format`);
    }
  );

  test.each([
    ["0.0.0", false],
    ["0.49.0", false],
    ["0.49.1", false],
    ["0.49.10", false],
    ["0.49.100", false],
    ["0.50.0", false],
    ["0.50.1", true],
    ["0.51.0", true],
    ["1.0.0", true],
    ["0.100.0", true],
  ])("validateNextVersion : %s is %s", (nextVersion, success) => {
    if (success) {
      expect(() => {
        validateNextVersion(currentVersion, nextVersion);
      }).not.toThrow();
    } else {
      expect(() => {
        validateNextVersion(currentVersion, nextVersion);
      }).toThrow(`${nextVersion} is smaller than current version ${currentVersion}`);
    }
  });
});

describe("start", () => {
  const defaultParams = {
    token: "token",
    owner: "owner",
    repo: "repo",
    currentVersion,
    nextVersion: "0.60.0",
    getLatestReleaseVersion: () => Promise.resolve(currentVersion),
    mergedPullRequests: () => Promise.resolve([]),
    setOutput: () => {},
    exec: () => Promise.resolve(0),
  };

  test("error if cant get current version", async () => {
    const getLatestReleaseVersion = jest.fn(() => Promise.resolve(null));
    await expect(start({ ...defaultParams, getLatestReleaseVersion })).rejects.toThrow(
      "can't get currentVersion"
    );
    const { token, owner, repo } = defaultParams;
    expect(getLatestReleaseVersion).toHaveBeenCalledWith({ token, owner, repo });
  });

  test("start function should be called only if nextVersion is valid", async () => {
    const pullRequestInfo: PullRequestInfo = {
      number: 1,
      title: "title",
      authorName: "author",
      url: "https://example.com/owner/repo/pull/1",
    };
    const mergedPullRequests = jest.fn(() => Promise.resolve([pullRequestInfo]));
    const setOutput = jest.fn(() => {});
    const exec = jest.fn(() => Promise.resolve(0));
    const { token, owner, repo, nextVersion } = defaultParams;

    await expect(start({ ...defaultParams, mergedPullRequests, setOutput, exec })).resolves.toEqual(
      {
        nextVersion,
        pullRequestInfos: [pullRequestInfo],
      }
    );

    expect(mergedPullRequests).toHaveBeenCalledWith({
      token,
      owner,
      repo,
      base: `v${currentVersion}`,
      head: "HEAD",
    });

    expect(setOutput).toHaveBeenCalledWith("currentVersion", currentVersion);
    expect(setOutput).toHaveBeenCalledWith("nextVersion", nextVersion);
    expect(setOutput).toHaveBeenCalledWith("pullRequestInfos", JSON.stringify([pullRequestInfo]));

    const branchName = `bump-version-${nextVersion}`;
    expect(setOutput).toHaveBeenCalledWith("branchName", branchName);
    expect(exec).toHaveBeenCalledWith("git", ["switch", "-c", branchName]);
  });
});
