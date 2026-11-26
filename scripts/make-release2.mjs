// 用 GitHub API 创建 release
// 用法: node scripts/make-release2.mjs <token> <tag> <name> <notes-file>

import { readFileSync } from "node:fs";

const [, , token, tag, name, notesFile] = process.argv;

if (!token || !tag || !name || !notesFile) {
  console.error("用法: node scripts/make-release2.mjs <token> <tag> <name> <notes-file>");
  process.exit(2);
}

const body = readFileSync(notesFile, "utf8");
const payload = JSON.stringify({
  tag_name: tag,
  name,
  body,
  draft: false,
  prerelease: false,
});

const res = await fetch("https://api.github.com/repos//releases", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json; charset=utf-8",
  },
  body: payload,
});

const text = await res.text();
if (res.ok) {
  const j = JSON.parse(text);
  console.log("OK release created");
  console.log("  tag: " + j.tag_name);
  console.log("  URL: " + j.html_url);
  process.exit(0);
}
console.log("FAIL HTTP " + res.status);
console.log(text.slice(0, 500));
process.exit(1);
