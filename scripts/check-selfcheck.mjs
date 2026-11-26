#!/usr/bin/env node
/**
 * check-selfcheck.mjs —— 自检词一致性判定器
 *
 * 判定对象：同一个「破甲自检」在五个落点的中英文案是否逐字一致。
 *
 *   1. lib/index.js            SELF_CHECK_REPLY_ZH / SELF_CHECK_REPLY_EN  ← 唯一真源
 *   2. client.js               welcome.triggerReply（zh）与（en）        ← 面板首屏提示
 *   3. README.md               Self-check after install 代码块
 *   4. README.zh-CN.md         装完自检 代码块
 *   5. skills/gpt-pojia/SKILL.md  激活 代码块                            ← 技能入口
 *
 * 退出码：
 *   0  全部一致
 *   1  至少一处不一致 / 缺失（附带每处的字面内容与差异）
 *   2  读取失败（路径错、真源缺失）
 *
 * 用法：
 *   node check-selfcheck.mjs --root <仓库根目录>
 *   node check-selfcheck.mjs --root <仓库根目录> --json
 */

import fs from "node:fs";
import path from "node:path";

/* ── 参数 ─────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
function arg(name, def = "") {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const ROOT = path.resolve(arg("root", "."));
const AS_JSON = argv.includes("--json");

/* ── 工具 ─────────────────────────────────────────────────────────────── */

function readFile(rel) {
  const p = path.join(ROOT, rel);
  try {
    return { ok: true, text: fs.readFileSync(p, "utf8"), path: p };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e), path: p };
  }
}

/** 去掉行尾 \r、行首尾空白、末尾空行，用于逐行比较。 */
function normalizeBlock(raw) {
  return String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

/**
 * 从 JS 源码里取一个字符串常量数组，按 `.join("\n")` 拼回。
 *
 * 只认这一种写法：
 *   const NAME = [
 *     "a",
 *     "",
 *     "b",
 *   ].join("\n");
 * 认不出就返回 null —— 宁可判「取不到」，也不要猜一个值出来比较。
 */
function extractJoinedConst(src, name) {
  const re = new RegExp(
    `(?:export\\s+)?const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*\\.join\\(\\s*["']\\\\n["']\\s*\\)`,
    "m",
  );
  const m = src.match(re);
  if (!m) return null;

  const body = m[1];
  const parts = [];
  const strRe = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
  let sm;
  while ((sm = strRe.exec(body)) !== null) {
    const literal = sm[1] !== undefined ? sm[1] : sm[2];
    // 只还原我们真正需要的转义；其余原样保留，避免擅自改写内容。
    parts.push(literal.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  }
  return parts.length ? parts.join("\n") : null;
}

/** 从 JSON 风格的对象字面量里取一个字符串值，并还原 \n。 */
function extractJsonishString(src, key) {
  const re = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = src.match(re);
  if (!m) return null;
  return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
void extractJsonishString;

/**
 * 取 Markdown 里紧跟某个标题之后、第 blockIndex 条围栏代码块的内容。
 *
 * README 的结构是「触发词块」在前、「Expected reply 块」在后，所以必须显式指明
 * 取第几块 —— 按「哪块长得像回复」去猜会在改版后静默抓错，比直接报错更坏。
 * blockIndex 从 0 开始。取不到返回 null。
 */
function extractFencedAfterHeading(src, headingPattern, blockIndex = 0) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (headingPattern.test(lines[i])) { start = i; break; }
  }
  if (start < 0) return null;

  let i = start + 1;
  let seen = 0;
  while (i < lines.length) {
    // 撞到同级或更高级标题就停：不跨章节取块
    if (/^#{1,6}\s/.test(lines[i])) return null;

    if (/^\s*```/.test(lines[i])) {
      i += 1;
      const buf = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i += 1; }
      if (i >= lines.length) return null;
      if (seen === blockIndex) return buf.join("\n");
      seen += 1;
    }
    i += 1;
  }
  return null;
}

/* ── 采集 ─────────────────────────────────────────────────────────────── */

const findings = [];
function record(name, file, value, note = "") {
  findings.push({ name, file, value, note, present: typeof value === "string" });
}

const idx = readFile("lib/index.js");
if (!idx.ok) {
  console.error(`READ_FAIL lib/index.js: ${idx.error}`);
  process.exit(2);
}
const zhTruth = extractJoinedConst(idx.text, "SELF_CHECK_REPLY_ZH");
const enTruth = extractJoinedConst(idx.text, "SELF_CHECK_REPLY_EN");
if (!zhTruth) {
  console.error("TRUTH_MISSING: 无法从 lib/index.js 取到 SELF_CHECK_REPLY_ZH");
  process.exit(2);
}
record("truth.zh", "lib/index.js", zhTruth, "唯一真源（SELF_CHECK_REPLY_ZH）");
record("truth.en", "lib/index.js", enTruth, "唯一真源（SELF_CHECK_REPLY_EN）");

const client = readFile("client.js");
if (client.ok) {
  // 中英两条键同名（welcome.triggerReply），按值里含中文 / 含英文首句区分。
  const allReplies = [...client.text.matchAll(/"welcome\.triggerReply"\s*:\s*"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
  const zhReply = allReplies.find((v) => /小雨/.test(v)) ?? null;
  const enReply = allReplies.find((v) => /I am here/.test(v)) ?? null;
  record("client.zh", "client.js", zhReply, "面板首屏（中文）");
  record("client.en", "client.js", enReply, "面板首屏（英文）");
} else {
  record("client.zh", "client.js", null, `读取失败：${client.error}`);
  record("client.en", "client.js", null, `读取失败：${client.error}`);
}

const readmeEn = readFile("README.md");
record(
  "readme.en",
  "README.md",
  readmeEn.ok ? extractFencedAfterHeading(readmeEn.text, /^###\s+Self-check after install\s*$/, 2) : null,
  "README（英文）English-locale reply（第 3 块：触发词 / 中文回复 / 英文回复）",
);
record(
  "readme.en.zh",
  "README.md",
  readmeEn.ok ? extractFencedAfterHeading(readmeEn.text, /^###\s+Self-check after install\s*$/, 1) : null,
  "README（英文）中文 locale 回复（第 2 块）",
);

const readmeZh = readFile("README.zh-CN.md");
record(
  "readme.zh",
  "README.zh-CN.md",
  readmeZh.ok ? extractFencedAfterHeading(readmeZh.text, /^###\s+装完自检\s*$/, 1) : null,
  "README（中文）正常回复（第 2 块：第 1 块是触发词）",
);

const skill = readFile("skills/gpt-pojia/SKILL.md");
record(
  "skill.zh",
  "skills/gpt-pojia/SKILL.md",
  skill.ok ? extractFencedAfterHeading(skill.text, /^##\s+激活\s*$/) : null,
  "技能激活回复",
);

/* ── 判定 ─────────────────────────────────────────────────────────────── */

const zhRef = normalizeBlock(zhTruth);
const enRef = normalizeBlock(enTruth ?? "");

const ZH_KEYS = ["truth.zh", "client.zh", "readme.zh", "readme.en.zh", "skill.zh"];
const EN_KEYS = ["truth.en", "client.en", "readme.en"];

const problems = [];

for (const key of ZH_KEYS) {
  const f = findings.find((x) => x.name === key);
  if (!f) { problems.push({ key, kind: "missing-record", detail: "未采集" }); continue; }
  if (!f.present) { problems.push({ key, file: f.file, kind: "missing", detail: f.note }); continue; }
  const got = normalizeBlock(f.value);
  if (got !== zhRef) {
    const gotLines = got.split("\n");
    const refLines = zhRef.split("\n");
    const diffs = [];
    const n = Math.max(gotLines.length, refLines.length);
    for (let i = 0; i < n; i += 1) {
      if ((gotLines[i] ?? "<无>") !== (refLines[i] ?? "<无>")) {
        diffs.push({ line: i + 1, expected: refLines[i] ?? "<无>", actual: gotLines[i] ?? "<无>" });
      }
    }
    problems.push({ key, file: f.file, kind: "mismatch", diffs });
  }
}

for (const key of EN_KEYS) {
  const f = findings.find((x) => x.name === key);
  if (!f) { problems.push({ key, kind: "missing-record", detail: "未采集" }); continue; }
  if (!f.present) {
    // 英文真源在部分构型里可能不存在；只在真源存在时才要求其余落点
    if (key !== "truth.en") problems.push({ key, file: f.file, kind: "missing", detail: f.note });
    continue;
  }
  const got = normalizeBlock(f.value);
  if (got !== enRef) {
    const gotLines = got.split("\n");
    const refLines = enRef.split("\n");
    const diffs = [];
    const n = Math.max(gotLines.length, refLines.length);
    for (let i = 0; i < n; i += 1) {
      if ((gotLines[i] ?? "<无>") !== (refLines[i] ?? "<无>")) {
        diffs.push({ line: i + 1, expected: refLines[i] ?? "<无>", actual: gotLines[i] ?? "<无>" });
      }
    }
    problems.push({ key, file: f.file, kind: "mismatch", diffs });
  }
}

/* ── 输出 ─────────────────────────────────────────────────────────────── */

if (AS_JSON) {
  console.log(JSON.stringify({ root: ROOT, ok: problems.length === 0, findings, problems }, null, 2));
} else {
  console.log(`root = ${ROOT}`);
  console.log("");
  for (const f of findings) {
    const mark = f.present ? "OK  " : "MISS";
    console.log(`[${mark}] ${f.name.padEnd(11)} ${f.file.padEnd(30)} ${f.note}`);
    if (f.present) {
      for (const line of normalizeBlock(f.value).split("\n")) console.log(`         | ${line}`);
    }
    console.log("");
  }

  if (problems.length === 0) {
    console.log("VERDICT: PASS — 五个落点中英文案与真源逐字一致");
  } else {
    console.log(`VERDICT: FAIL — ${problems.length} 处问题`);
    for (const p of problems) {
      console.log("");
      console.log(`  ✗ ${p.key}  (${p.file ?? "-"})  ${p.kind}`);
      if (p.detail) console.log(`      ${p.detail}`);
      if (p.diffs) {
        for (const d of p.diffs) {
          console.log(`      line ${d.line}`);
          console.log(`        expected: ${d.expected}`);
          console.log(`        actual  : ${d.actual}`);
        }
      }
    }
  }
}

process.exit(problems.length === 0 ? 0 : 1);
