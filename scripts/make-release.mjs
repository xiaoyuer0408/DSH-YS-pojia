// 用 GitHub API 创建 v1.4.0 release
// 用法: node scripts/make-release.mjs <token> <notes-file>

import { readFileSync } from "node:fs";

const token = process.argv[2];
const notesFile = process.argv[3];

if (!token || !notesFile) {
  console.error("用法: node scripts/make-release.mjs <token> <notes-file>");
  process.exit(2);
}

const body = readFileSync(notesFile, "utf8");
const payload = JSON.stringify({
  tag_name: "v1.4.0",
  name: "v1.4.0 — 适配 DSH 0.2.2-rc.5",
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
  console.log("OK Release created");
  console.log("  id:  " + j.id);
  console.log("  tag: " + j.tag_name);
  console.log("  URL: " + j.html_url);
  process.exit(0);
}
console.log("FAIL HTTP " + res.status);
console.log(text.slice(0, 500));
process.exit(1);
