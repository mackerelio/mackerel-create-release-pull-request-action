import fs from "fs";
import { create } from "@actions/glob";

// Rewrite the contents of the matching file using callback
export async function replaceContents(
  argGlob: readonly string[],
  callback: (content: string, path: string) => string
): Promise<void> {
  const globber = await create(argGlob.join("\n"));
  const paths = await globber.glob();

  for (const path of paths) {
    let content = callback(await fs.promises.readFile(path, "utf8"), path);

    // Add If the new line at the end of the content does not exist
    if (!/[\r\n]$/.test(content)) {
      content += "\n";
    }

    // Inherit permissions.
    const stat = await fs.promises.stat(path);
    await fs.promises.writeFile(path, content, { encoding: "utf8", mode: stat.mode });
  }
}
