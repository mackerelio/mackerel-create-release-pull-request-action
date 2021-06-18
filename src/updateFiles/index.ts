import { format } from "date-fns";
import escapeStringRegexp from "escape-string-regexp";
import { PullRequestInfo } from "../collectRepositoryInfo";
import { replaceContents } from "./utils";

const email = "mackerel-developers@hatena.ne.jp";
const name = "mackerel";

export async function bumpVersionGo(versionGoPath: string, nextVersion: string): Promise<void> {
  const regex = new RegExp(`^(const *version *= *").*?(")`, "m");
  await replaceContents([versionGoPath], content =>
    content.replace(regex, (match, p1, p2) => `${p1}${nextVersion}${p2}`)
  );
}

export async function bumpMakefile(makefilePath: string, nextVersion: string): Promise<void> {
  await replaceContents([makefilePath], content =>
    content.replace(/^(VERSION *:?= *).*?$/m, (matched, p1) => {
      return `${p1}${nextVersion}`;
    })
  );
}

function detectDebianRevision(packagenName: string, content: string): string | undefined {
  const escapedPackagenName = escapeStringRegexp(packagenName);
  const reg = new RegExp(
    `^${escapedPackagenName} \\([0-9]+(?:\\.[0-9]+){2}-(?<revision>[^)]+)\\) stable;`
  );
  const matched = reg.exec(content);
  return matched?.groups?.revision;
}

export async function updateDebPackageChangelog(
  debPackageChangelogPath: string,
  date: Date,
  packageName: string,
  nextVersion: string,
  prs: PullRequestInfo[]
): Promise<void> {
  await replaceContents([debPackageChangelogPath], content => {
    const revision = detectDebianRevision(packageName, content);
    if (revision === undefined) {
      throw new Error(`packageName is invalid. : ${packageName}`);
    }
    let update = `${packageName} (${nextVersion}-${revision}) stable; urgency=low\n\n`;
    for (const pr of prs) {
      update += `  * ${pr.title} (by ${pr.authorName})\n    <${pr.url}>\n`;
    }
    update += `\n -- ${name} <${email}>  ${format(date, "E, d MMM Y HH:mm:ss xx")}\n\n`;
    return update + content;
  });
}

export async function updateRpmPackageChangelog(
  rpmPackageChangelogPath: string,
  date: Date,
  nextVersion: string,
  prs: PullRequestInfo[]
): Promise<void> {
  await replaceContents([rpmPackageChangelogPath], content => {
    let update = `* ${format(date, "E MMM d Y")} <${email}> - ${nextVersion}\n`;
    for (const pr of prs) {
      update += `- ${pr.title} (by ${pr.authorName})\n`;
    }
    return content.replace(/(%changelog)/, (matched, p1) => `${p1}\n${update}`);
  });
}

export async function updateMarkdownChangelog(
  markdownPath: string,
  date: Date,
  nextVersion: string,
  prs: PullRequestInfo[]
): Promise<void> {
  await replaceContents([markdownPath], content => {
    let update = `\n\n## ${nextVersion} (${format(date, "Y-MM-dd")})\n\n`;
    for (const pr of prs) {
      update += `* ${pr.title} #${pr.number} (${pr.authorName})\n`;
    }
    return content.replace(/^(# Changelog)/m, (matched, p1) => `${p1}${update}`);
  });
}

export function validatePackageName(packageName: string): void {
  if (!/^[a-zA-Z0-9_-]{2,50}$/.test(packageName)) {
    throw new Error("packageName is invalid");
  }
}
