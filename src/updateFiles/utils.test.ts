import fs from "fs";
import { cp } from "@actions/io";
import snapshotDiff from "snapshot-diff";
import { file } from "tmp-promise";
import { replaceContents } from "./utils";

describe("replaceContents", () => {
  describe("glob", () => {
    it("dirglob", async () => {
      const files: string[] = [];
      await replaceContents(["testdata/replace/glob/*/file1"], (data, path) => {
        files.push(path);
        return data;
      });

      expect(files).toEqual([
        `${process.cwd()}/testdata/replace/glob/dir1/file1`,
        `${process.cwd()}/testdata/replace/glob/dir2/file1`,
      ]);
    });

    it("fileglob", async () => {
      const files: string[] = [];
      await replaceContents(["testdata/replace/glob/dir1/file*"], (data, path) => {
        files.push(path);
        return data;
      });

      expect(files).toEqual([
        `${process.cwd()}/testdata/replace/glob/dir1/file1`,
        `${process.cwd()}/testdata/replace/glob/dir1/file2`,
      ]);
    });
  });

  describe("can replace content", () => {
    it("keep permission", async () => {
      const { path: testFilePath } = await file();
      await fs.promises.writeFile(testFilePath, "\n", { mode: 0o755 });
      const before = await fs.promises.stat(testFilePath);

      await replaceContents([testFilePath], data => data);

      const after = await fs.promises.stat(testFilePath);
      expect(before.mode).toEqual(after.mode);
    });

    it("keep utf8 encoding", async () => {
      const initialFile = "testdata/replace/utf8.txt";
      const initial = await fs.promises.readFile(initialFile, "utf8");

      const { path: testFilePath } = await file();
      await cp(initialFile, testFilePath);

      await replaceContents([testFilePath], data => data);

      const processed = await fs.promises.readFile(testFilePath, "utf8");
      expect(initial).toEqual(processed);
    });

    it("results is ended newline", async () => {
      const initialFile = "testdata/replace/test.txt";
      const initial = await fs.promises.readFile(initialFile, "utf8");

      const { path: testFilePath } = await file();
      await cp(initialFile, testFilePath);

      await replaceContents([testFilePath], data => `${data}ddd\n`);

      const processed = await fs.promises.readFile(testFilePath, "utf8");
      expect(snapshotDiff(initial, processed)).toMatchSnapshot();
    });

    it("append newline when ended newline is not exist", async () => {
      const initialFile = "testdata/replace/test.txt";
      const initial = await fs.promises.readFile(initialFile, "utf8");

      const { path: testFilePath } = await file();
      await cp(initialFile, testFilePath);

      await replaceContents([testFilePath], data => `${data}ddd`);

      const processed = await fs.promises.readFile(testFilePath, "utf8");
      expect(snapshotDiff(initial, processed)).toMatchSnapshot();
    });

    it("replace version in Makefile", async () => {
      const initialFile = "testdata/replace/Makefile.txt";
      const initial = await fs.promises.readFile(initialFile, "utf8");

      const { path: testFilePath } = await file();
      await cp(initialFile, testFilePath);

      const nextVersion = "4.5.6";
      await replaceContents([testFilePath], data =>
        data.replace(/^VERSION( *:*= *).*?\n/ms, (match, p1) => `VERSION${p1}${nextVersion}\n`)
      );

      const processed = await fs.promises.readFile(testFilePath, "utf8");
      expect(snapshotDiff(initial, processed)).toMatchSnapshot();
    });

    it("replace fragment rpm specfile", async () => {
      const initialFile = "testdata/replace/rpmspec.txt";
      const initial = await fs.promises.readFile(initialFile, "utf8");

      const { path: testFilePath } = await file();
      await cp(initialFile, testFilePath);

      const appendChangelog = [
        "* Thu Feb 18 2021 <foo@example.com> - 1.2.4",
        "- hoge huga piyoe",
        "",
      ].join("\n");
      await replaceContents([testFilePath], data =>
        data.replace(/%changelog/, `%changelog\n${appendChangelog}`)
      );

      const processed = await fs.promises.readFile(testFilePath, "utf8");
      expect(snapshotDiff(initial, processed)).toMatchSnapshot();
    });
  });
});
