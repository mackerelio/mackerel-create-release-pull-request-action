import { finish, send, PullsCreateResponse } from "./finish";

describe("finish", () => {
  const defaultParams = {
    owner: "owner",
    repo: "repo",
    base: "master",
    nextVersion: "1.0.0",
    branchName: "bump-version-1.0.0",
    inputPullRequestInfos: [
      "[",
      `{"number":2,"title":"title2","authorName":"author2","url":"https://example.com/owner/repo/pull/2"}`,
      ",",
      `{"number":1,"title":"title","authorName":"author","url":"https://example.com/owner/repo/pull/1"}`,
      "]",
    ].join(""),
  };

  test("can exec git commands, create infomation", async () => {
    const exec = jest.fn(() => Promise.resolve(0));

    const body = ["- title2 #2", "- title #1", ""].join("\n");
    await expect(finish({ ...defaultParams, exec })).resolves.toEqual({
      head: "owner:bump-version-1.0.0",
      base: "master",
      title: "Release version 1.0.0",
      body,
    });
    expect(exec).toHaveBeenCalledWith("git", ["add", "."]);
    expect(exec).toHaveBeenCalledWith("git", [
      "commit",
      "-m",
      "ready for next release and update changelogs. version: 1.0.0",
    ]);
  });

  test("body is empty when inputPullRequestInfos is empty", async () => {
    const exec = jest.fn(() => Promise.resolve(0));

    await expect(finish({ ...defaultParams, inputPullRequestInfos: "", exec })).resolves.toEqual({
      head: "owner:bump-version-1.0.0",
      base: "master",
      title: "Release version 1.0.0",
      body: "",
    });
  });

  test("get rejecet when inputPullRequestInfos is invalid", async () => {
    const exec = jest.fn(() => Promise.resolve(0));

    await expect(
      finish({ ...defaultParams, inputPullRequestInfos: '[{"hoge":1},{"hoge":2}]', exec })
    ).rejects.toThrow("inputPullRequestInfos is invalid.");
  });
});

describe("send", () => {
  const defaultParams = {
    pullsCreateParams: {
      owner: "owner",
      repo: "repo",
      head: "owner:bump-version-1.0.0",
      base: "master",
      title: "Release version 1.0.0",
      body: "body",
    },
    branchName: "bump-version-1.0.0",
  };

  test("can exec git push, send create pull request", async () => {
    const exec = jest.fn(() => Promise.resolve(0));
    const create = jest.fn(
      (): Promise<PullsCreateResponse> => Promise.resolve({} as PullsCreateResponse)
    );

    await send({ ...defaultParams, exec, create });
    expect(exec).toHaveBeenCalledWith("git", ["push", "origin", defaultParams.branchName]);
    expect(create).toHaveBeenCalledWith(defaultParams.pullsCreateParams);
  });
  test("not executed create. when git push fails", async () => {
    const exec = jest.fn(() => Promise.reject(new Error("failed")));
    const create = jest.fn(
      (): Promise<PullsCreateResponse> => Promise.resolve({} as PullsCreateResponse)
    );

    await expect(send({ ...defaultParams, exec, create })).rejects.toThrow("failed");
    expect(exec).toHaveBeenCalledWith("git", ["push", "origin", defaultParams.branchName]);
    expect(create).not.toHaveBeenCalled();
  });
  test("throw error when create pull request.", async () => {
    const exec = jest.fn(() => Promise.resolve(0));
    const create = jest.fn((): Promise<PullsCreateResponse> => Promise.reject(new Error("failed")));

    await expect(send({ ...defaultParams, exec, create })).rejects.toThrow("failed");
    expect(exec).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });
});
