import fs from "fs";
import { cp } from "@actions/io";
import snapshotDiff from "snapshot-diff";
import timezoneMock from "timezone-mock";
import { file } from "tmp-promise";
import { PullRequestInfo } from "../collectRepositoryInfo";
import {
  bumpMakefile,
  bumpVersionGo,
  updateDebPackageChangelog,
  updateRpmPackageChangelog,
  updateMarkdownChangelog,
  validatePackageName,
} from "./";

beforeAll(() => {
  timezoneMock.register("UTC");
});

afterAll(() => {
  timezoneMock.unregister();
});

describe("bumpVersionGo", () => {
  it("can rewrite version", async () => {
    const initialFile = "testdata/bumpVersionGo/version.go.txt";
    const initial = await fs.promises.readFile(initialFile, "utf8");

    const { path: testFilePath } = await file();
    await cp(initialFile, testFilePath);

    await bumpVersionGo(testFilePath, "0.1.1");

    const processed = await fs.promises.readFile(testFilePath, "utf8");
    expect(snapshotDiff(initial, processed)).toMatchSnapshot();
  });
});

describe("bumpMakefile", () => {
  it("can rewrite version", async () => {
    const initialFile = "testdata/bumpMakefile/Makefile.txt";
    const initial = await fs.promises.readFile(initialFile, "utf8");

    const { path: testFilePath } = await file();
    await cp(initialFile, testFilePath);

    await bumpMakefile(testFilePath, "0.1.2");

    const processed = await fs.promises.readFile(testFilePath, "utf8");
    expect(snapshotDiff(initial, processed)).toMatchSnapshot();
  });
});

const date = new Date(Date.UTC(2021, 1, 20, 7, 0, 0));

const prs: PullRequestInfo[] = [
  {
    title: "hoge huga",
    authorName: "piyo",
    url: "https://example.com/hogehuga",
    number: 3,
  },
  {
    title: "honyarara",
    authorName: "piyo",
    url: "https://example.com/honyarara",
    number: 4,
  },
];

describe("updateDebPackageChangelog", () => {
  test("can append text", async () => {
    const initialFile = "testdata/updateDebPackageChangelog/testing.txt";
    const initial = await fs.promises.readFile(initialFile, "utf8");

    const { path: testFilePath } = await file();
    await cp(initialFile, testFilePath);

    await updateDebPackageChangelog(testFilePath, date, "test", "0.1.2", prs);

    const processed = await fs.promises.readFile(testFilePath, "utf8");
    expect(snapshotDiff(initial, processed)).toMatchSnapshot();
  });
  test("throw error when invalid package name", async () => {
    const initialFile = "testdata/updateDebPackageChangelog/testing.txt";
    const { path: testFilePath } = await file();
    await cp(initialFile, testFilePath);
    await expect(
      updateDebPackageChangelog(testFilePath, date, "foo", "0.1.2", prs)
    ).rejects.toThrow("packageName is invalid. : foo");
  });
});

describe("updateRpmPackageChangelog", () => {
  test("can append text", async () => {
    const initialFile = "testdata/updateRpmPackageChangelog/testing.txt";
    const initial = await fs.promises.readFile(initialFile, "utf8");

    const { path: testFilePath } = await file();
    await cp(initialFile, testFilePath);

    await updateRpmPackageChangelog(testFilePath, date, "0.1.2", prs);

    const processed = await fs.promises.readFile(testFilePath, "utf8");
    expect(snapshotDiff(initial, processed)).toMatchSnapshot();
  });
});

describe("updateMarkdownChangelog", () => {
  test("can append text", async () => {
    const initialFile = "testdata/updateMarkdownChangelog/testing.txt";
    const initial = await fs.promises.readFile(initialFile, "utf8");

    const { path: testFilePath } = await file();
    await cp(initialFile, testFilePath);

    await updateMarkdownChangelog(testFilePath, date, "0.1.2", prs);

    const processed = await fs.promises.readFile(testFilePath, "utf8");
    expect(snapshotDiff(initial, processed)).toMatchSnapshot();
  });
});

describe("validatePackageName", () => {
  test("can validate packageName", async () => {
    expect(() => {
      validatePackageName("mackerel-agent");
    }).not.toThrow();
  });
  test("throw exception when packageName is invalid", async () => {
    expect(() => {
      validatePackageName("invalid-packageName-**");
    }).toThrow("packageName is invalid");
  });
});
