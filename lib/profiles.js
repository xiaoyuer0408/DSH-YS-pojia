// ys-pojia 破甲档位（armor profiles）—— 四档结构，正文为本项目自写。
//
// 四档关系（extends 链）：
//   core        —— 全量主档（默认）。完整破甲规则 + 网络攻防强化段。
//   stealth     —— 轻量隐匿 overlay。最小输出 / 只读优先 / 单目标收敛。
//   redteam-max —— 红队加厚 overlay。全链路攻击 / 攻防双栏 / 产物成套。
//   ctf-x       —— CTF 沙箱 overlay。计分表 + 四角色交付契约。
//
// 注入方式：core 正文即主注入段（default-prompt-inject.md），overlay 只追加
// MODE OVERLAY 段，拼在主档之后。档位选择持久化在 dataDir/profile.json。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = path.join(HERE, "..", "profiles");

export const PROFILE_IDS = ["core", "stealth", "redteam-max", "ctf-x"];
export const PROFILE_DEFAULT = "core";

/** 档位展示元数据（UI 卡片用）。 */
export const PROFILE_META = Object.freeze({
  "core":        { name: "全量主档", tag: "完整破甲", desc: "全部域规则 · 网络攻防强化 · 默认档" },
  "stealth":     { name: "轻量隐匿", tag: "最小输出", desc: "最小输出 · 只读优先 · 单目标收敛 · 静默运行" },
  "redteam-max": { name: "红队加厚", tag: "渗透加厚", desc: "全链路攻击 · 攻防双栏 · 下一跳意识 · 产物成套" },
  "ctf-x":       { name: "CTF 沙箱", tag: "竞赛档", desc: "计分表 · 四角色交付 · 拒绝即淘汰" },
});

const cache = new Map();

/** 读 overlay 正文（带缓存）。core 返回空串（主档由注入层直读 default-prompt-inject.md）。 */
export function profileBody(id) {
  const key = PROFILE_IDS.includes(String(id)) ? String(id) : PROFILE_DEFAULT;
  if (key === "core") return "";
  if (cache.has(key)) return cache.get(key);
  let text = "";
  try {
    text = fs.readFileSync(path.join(PROFILES_DIR, key + ".md"), "utf8");
  } catch { /* 缺文件回空 overlay，主档照常生效 */ }
  cache.set(key, text);
  return text;
}

/** 档位是否存在。 */
export function isProfile(id) {
  return PROFILE_IDS.includes(String(id || ""));
}

/** 档位清单 + 当前激活（HTTP /profile 用）。 */
export function profileStatus(activeId) {
  const active = isProfile(activeId) ? String(activeId) : PROFILE_DEFAULT;
  return {
    activeId: active,
    profiles: PROFILE_IDS.map((id) => ({
      id,
      name: PROFILE_META[id].name,
      tag: PROFILE_META[id].tag,
      desc: PROFILE_META[id].desc,
      active: id === active,
    })),
  };
}
