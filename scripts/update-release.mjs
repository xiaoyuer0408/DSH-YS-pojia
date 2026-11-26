// 更新已有 GitHub Release 的说明
// 用法: node scripts/update-release.mjs <token> <release-id> <notes-file>

import { readFileSync } from "node:fs";

const token = process.argv[2];
const releaseId = process.argv[3];
const notesFile = process.argv[4];

if (!token || !releaseId || !notesFile) {
  console.error("用法: node scripts/update-release.mjs <token> <release-id> <notes-file>");
  process.exit(2);
}

const body = readFileSync(notesFile, "utf8");
const payload = JSON.stringify({ body });

const res = await fetch(
  "https://api.github.com/repos//releases/" + releaseId,
  {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: payload,
  }
);

const text = await res.text();
if (res.ok) {
  const j = JSON.parse(text);
  console.log("OK Release updated");
  console.log("  body length: " + j.body.length);
  console.log("  URL: " + j.html_url);
  process.exit(0);
}
console.log("FAIL HTTP " + res.status);
console.log(text.slice(0, 400));
process.exit(1);
