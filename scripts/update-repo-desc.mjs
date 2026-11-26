// 用 GitHub API 更新仓库描述
// 用法: node scripts/update-repo-desc.mjs <token> <description>

import { readFileSync } from "node:fs";
import path from "node:path";

const token = process.argv[2];
const desc = process.argv[3];

if (!token || !desc) {
  console.error("用法: node scripts/update-repo-desc.mjs <token> <description>");
  process.exit(2);
}

const payload = JSON.stringify({ description: desc });

const res = await fetch("https://api.github.com/repos/", {
  method: "PATCH",
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
  console.log("OK description updated");
  console.log("  " + j.description.slice(0, 200));
  process.exit(0);
}
console.log("FAIL HTTP " + res.status);
console.log(text.slice(0, 400));
process.exit(1);
