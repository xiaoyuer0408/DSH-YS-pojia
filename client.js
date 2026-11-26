window.__ModuleLoader__.load({ id: "ys-pojia", factory: (require) => {

		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const h = react.createElement;
		const { useState, useEffect, useCallback, useRef, Component } = react;

/* 仓库地址。求 star 和「更新去仓库看」都指向这里。 */
const REPO_URL = "";

/*
 * 打开一个外部链接。
 *
 * 为什么不能用 <a target="_blank">：
 *   DSH 主进程的 navigation-policy.mjs 里，setWindowOpenHandler 对渲染进程发起
 *   的弹窗一律返回 { action: "deny" }，源注释写得很直白——渲染进程的弹窗永远
 *   不会被提升成系统浏览器。所以卡片上那几个 target=_blank 的按钮点了没反应，
 *   既不跳转也不报错。
 *
 * 合法通道只有一条：preload 暴露的 window.dshDesktop.openExternalUrl，它
 * invoke 到 'desktop:external-url-open'，主进程侧（navigation-policy.mjs 的
 * installTrustedExternalOpenPolicy）只放行主 frame、只要 http/https、且拒绝
 * 指向 runtime 自身 origin 的地址。
 *
 * 三级回退：
 *   1. window.dshDesktop.openExternalUrl —— 桌面端
 *   2. window.open('_blank')             —— 浏览器 / Web 端仍可用
 *   3. 复制到剪贴板 + 界面提示            —— 前两条都被拦时的兜底
 *
 * 返回 Promise<"opened" | "copied" | "failed">，调用方据此给真实反馈，
 * 不能一律弹「已打开」。
 */
async function openExternalUrl(url) {
	try {
		const bridge = typeof window !== "undefined" ? window.dshDesktop : undefined;
		if (bridge && typeof bridge.openExternalUrl === "function") {
			await bridge.openExternalUrl(url);
			return "opened";
		}
	} catch { /* 落到下一条路 */ }
	try {
		const w = window.open(url, "_blank", "noopener,noreferrer");
		if (w) return "opened";
	} catch { /* 落到兜底 */ }
	/* 最后一条：复制地址，让用户自己粘到浏览器 */
	try {
		if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
			await navigator.clipboard.writeText(url);
			return "copied";
		}
		const ta = document.createElement("textarea");
		ta.value = url;
		ta.setAttribute("readonly", "");
		ta.style.position = "fixed";
		ta.style.left = "-9999px";
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand("copy");
		document.body.removeChild(ta);
		return ok ? "copied" : "failed";
	} catch { return "failed"; }
}

		const name = "ys-pojia";
		const inject = ["slots", "locale", "uiConversation"];
		const NS = "settings.ys-pojia";
/*
 * 取译文。
 *
 * 直接按 currentLang 查本地字典，不走 ctx.locale.bind —— 那个绑定跟的是宿主
 * locale，用户点面板里的中英切换时它不会变，界面文案会停在旧语言上。
 *
 * 缺键时的兜底顺序：当前语言 → 另一种语言 → 键名本身。保留最后一步是为了
 * 漏翻时界面上能看见键名、一眼定位，而不是空白。
 */
let translate = (key) => {
  const dict = currentLang === "zh" ? zh : en;
  const other = currentLang === "zh" ? en : zh;
  const v = dict[key];
  if (v !== undefined) return v;
  const o = other[key];
  if (o !== undefined) return o;
  return key;
};
		/* 当前界面语言。ctx.locale.bind() 出来的 translate 只给译文，
		   组件里要按语言切 label_en / lockedReason_en，所以单独留一个口子。 */
/*
 * 界面语言。
 *
 * 默认英文：插件的用户面里非中文用户占多数，英文做默认不用先切一次。
 * 用户手动切到中文后写 localStorage，下次打开保持 —— 存的是「用户的选择」，
 * 不是宿主 locale，所以宿主切语言不会把他刚选的覆盖掉。
 */
const LANG_KEY = "ys-pojia.uiLang";
let currentLang = "en";
/** 读用户上次的选择。没存过返回空串，交给调用方走默认。 */
function readStoredLang() {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return v === "zh" || v === "en" ? v : "";
  } catch { return ""; }
}
/** 写用户的选择。localStorage 不可用（隐私模式）时静默失败。 */
function storeLang(lang) {
  try { window.localStorage.setItem(LANG_KEY, lang === "zh" ? "zh" : "en"); } catch { /* ignore */ }
}
/* 启动时先套用用户存过的选择；没有就保持默认 en。 */
/**
 * 探测用户默认语言。
 *
 * 三级回退，优先级从高到低：
 *   1. navigator.languages[0] —— 浏览器/Electron 的用户首选语言
 *   2. navigator.language      —— 老浏览器只有这个
 *   3. Intl.DateTimeFormat().resolvedOptions().locale —— 前面都拿不到时的兜底
 *
 * 只认 zh 前缀为中文，其余一律英文。这样 zh-CN / zh-TW / zh-Hant 都算中文，
 * 而 ja / ko / de 之类走英文 —— 插件只有中英两套字典，日韩用户看英文比看中文有用。
 */
function detectSystemLang() {
  const probe = (v) => {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return "";
    return s.startsWith("zh") ? "zh" : "en";
  };
  try {
    const langs = navigator.languages;
    if (Array.isArray(langs)) {
      for (const l of langs) {
        const hit = probe(l);
        if (hit) return hit;
      }
    }
  } catch { /* navigator 不可用 */ }
  try {
    const hit = probe(navigator.language);
    if (hit) return hit;
  } catch { /* ignore */ }
  try {
    const hit = probe(Intl.DateTimeFormat().resolvedOptions().locale);
    if (hit) return hit;
  } catch { /* ignore */ }
  return "en";
}

/*
 * 启动时定语言：用户存过就用存的，没存过就跟系统语言。
 *
 * 首次加载的须知弹窗也走这条路径 —— 中文系统的用户第一次打开看到的就是中文，
 * 不用先去点切换按钮。
 */
currentLang = readStoredLang() || detectSystemLang();
/** 语言变化的订阅者。切换后让顶层组件重渲染。 */
const langSubs = new Set();
function setUiLang(lang) {
  const next = lang === "zh" ? "zh" : "en";
  if (next === currentLang) return;
  currentLang = next;
  storeLang(next);
  for (const fn of langSubs) { try { fn(next); } catch { /* ignore */ } }
}
/**
 * 读当前界面语言，并在切换时触发重渲染。
 *
 * 早先它只是 return 一个模块级变量 —— 切语言时值变了，但没有任何组件知道
 * 该重渲染，界面就停在旧语言上。现在挂一个订阅，切换时 setState。
 */
function useLang() {
  const [lang, setLang] = useState(currentLang);
  useEffect(() => {
    const fn = (next) => setLang(next);
    langSubs.add(fn);
    // 订阅建立之前可能已经切过，补一次同步
    setLang(currentLang);
    return () => { langSubs.delete(fn); };
  }, []);
  return lang;
}
/**
 * 取译文函数。
 *
 * 订阅语言变化：translate 本身按 currentLang 查字典，值是对的，但组件不重渲染
 * 就看不见变化。这里挂一个空 setState 强制重渲染。
 */
function useT() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((v) => v + 1);
    langSubs.add(fn);
    return () => { langSubs.delete(fn); };
  }, []);
  return translate;
}
		function clientGuessSurface() {
			try {
				/* Android 优先判：DSH Go 是 Flutter 壳 + 预构建 vite dist，
				 * 跟 Web 前端不是同一套渲染器。判据三条：
				 *   1. UA 含 Android 且不是桌面 Electron
				 *   2. 协议是 capacitor / ionic（Go 壳可能用）
				 *   3. 全局对象里有 DSH Go 注入的标记
				 * 判错方向有讲究：宁可漏判成 web 也不要误判成 android ——
				 * 误判会让桌面用户丢掉命令回显卡片。 */
				if (typeof navigator !== "undefined") {
					const ua = String(navigator.userAgent || "");
					const isElectron = /electron/i.test(ua);
					if (!isElectron && /android/i.test(ua)) return "android";
				}
				if (typeof window !== "undefined" && window.__DSH_GO__) return "android";
				if (typeof location !== "undefined") {
					const proto = String(location.protocol || "");
					if (proto === "capacitor:" || proto === "ionic:") return "android";
				}
				if (typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent || "")) return "desktop";
				if (typeof location !== "undefined") {
					const port = String(location.port || "");
					if (port === "43120") return "desktop";
					const host = String(location.hostname || "");
					if (host && host !== "127.0.0.1" && host !== "localhost" && /dsh desktop/i.test(String(location.href || ""))) return "desktop";
				}
			} catch { /* ignore */ }
			return "";
		}
		function hostSurfaceOf(s) {
			return (s && s.surface) || clientGuessSurface() || "web";
		}
		function hostText(t, key, surface) {
			if (surface && surface !== "web") {
				const specific = key + "." + surface;
				const hit = t(specific);
				if (hit && hit !== specific) return hit;
			}
			return t(key);
		}
		function apiUrl(p) {
			try { return new URL(p, window.location.origin).toString(); } catch { return p; }
		}
		function apiTimeoutMs(p, init) {
			const path = String(p || "");
			const method = String((init && init.method) || "GET").toUpperCase();
			if (path.indexOf("/ys-pojia/uninstall") !== -1) return 90000;
			if (path.indexOf("/ys-pojia/skill") !== -1) return method === "POST" ? 120000 : 20000;
			// status 会在"应用"期间被后端的同步落盘阻塞，默认 20s 必然被 abort，界面只会显示"读取失败: timeout"。
			if (path.indexOf("/ys-pojia/status") !== -1) return 60000;
			if (path.indexOf("/ys-pojia/apply") !== -1) return 240000;
			if (path.indexOf("/ys-pojia/revert") !== -1) return 120000;
			if (path.indexOf("/ys-pojia/restart") !== -1) return 60000;
			return 20000;
		}
		function isAbortError(e) {
			const msg = String((e && e.message) || e || "");
			return (e && e.name === "AbortError") || /aborted|abort/i.test(msg);
		}
		async function apiJson(p, init) {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), apiTimeoutMs(p, init));
			try {
				const r = await fetch(apiUrl(p), Object.assign({ cache: "no-store", credentials: "same-origin", signal: ctrl.signal }, init || {}));
				const text = await r.text();
				let data;
				try { data = text ? JSON.parse(text) : null; } catch {
					throw new Error(r.status + " non-json: " + text.slice(0, 120));
				}
				if (!r.ok) throw new Error((data && (data.error || data.message)) || (r.status + " " + r.statusText));
				return data;
			} catch (e) {
				if (isAbortError(e)) throw new Error("timeout");
				const msg = String((e && e.message) || e || "");
				if (/failed to fetch|networkerror|load failed/i.test(msg)) {
					throw new Error("Cannot reach the API. Make sure dsh is still running, then press Ctrl+F5");
				}
				throw e;
			} finally { clearTimeout(timer); }
		}

		function promptBoxEmpty(text) {
			return !String(text || "").trim();
		}

		function responseNeedsPrompt(d) {
			return Boolean(d && (d.needPrompt || d.injectSource === "none"));
		}

		function warnNeedPrompt(d, tr) {
			if (!responseNeedsPrompt(d)) return false;
			window.alert(tr("need.prompt"));
			return true;
		}

		async function bothInjectEmpty(overrideText, defaultText) {
			if (!promptBoxEmpty(overrideText)) return false;
			if (!promptBoxEmpty(defaultText)) return false;
			return true;
		}

		function rulesApi(op, extra) {
			return apiJson("/ys-pojia/rules", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(Object.assign({ op: op }, extra || {})),
			});
		}

		function skillsRouteMissing(e) {
			return /\b404\b|\b405\b|non-json/i.test(String((e && e.message) || e || ""));
		}

		function skillsApi(op, extra) {
			const init = {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(Object.assign({ op: op }, extra || {})),
			};
			return apiJson("/ys-pojia/skills", init).catch((e) => {
				if (!skillsRouteMissing(e)) throw e;
				return apiJson("/ys-pojia/skill", init);
			});
		}

		const TARGETS = ["AGENTS.md", "CLAUDE.md"];

		const zh = {
			nav: "规则设定",
			"armor.title": "破甲规则",
			"armor.enabledUnit": "条已启用",
			"armor.loading": "正在读取规则…",
			"armor.retry": "重试",
			"armor.err": "读取失败：",
			"armor.selectAll": "全选",
			"armor.selectNone": "全清",
			"armor.resetDefault": "恢复默认",
			"armor.groupAll": "本类全选",
			"armor.groupClear": "本类全清",
			"armor.missing": "以下规则在当前提示词正文里不存在，勾选不会生效：{ids}",
			"armor.absentHint": "当前提示词正文里没有这一条",
			"armor.presets": "预设方案",
			"armor.search": "搜索规则 / 标签…",
			"armor.searchEmpty": "没有匹配的规则",
			"armor.level.core": "核心",
			"armor.level.std": "标准",
			"armor.level.agg": "激进",
			"armor.levelAll": "全部强度",
			"armor.matched": "筛出 {n} 条",
			"armor.clearFilter": "清除筛选",
			"armor.auditOk": "正文结构自检通过：规则块定位正常，40 条齐全。",
			"armor.auditBad": "正文结构自检未通过：",
			"armor.auditBlock": "规则块 {n} 条（第 {start}–{end} 行）",
			"armor.newBadge": "新增",
			"armor.groupEmpty": "本类已无可显示规则",
			"dock.clean": "注入",
  "host.card.title": "宿主",
  "host.card.nover": "未知",
  "host.card.patches": "补丁",
  "host.card.drifted": "{n} 条漂移",
  "host.card.engines": "可用引擎",
  "host.card.current": "（当前）",
  "host.card.why": "降级",
  "host.card.nobase": "找不到宿主安装目录，补丁无处落笔，只剩提示词层",
  "host.level.exact": "已验证",
  "host.level.minor": "同系列",
  "host.level.cross": "跨版本",
  "host.level.unknown": "未知",
  "host.level.none": "未检测",
			"dock.rules": "规则集",
			"dock.armor": "破甲",
			"dock.engine": "引擎",
			"dock.misc": "杂项",
			"misc.title": "杂项设定",
			"misc.hint": "破甲以外的全部可调项。改动即时生效，无需重启。",
			"misc.group.persona": "人设",
		"misc.persona.name": "名字",
		"misc.persona.name.d": "模型的自称名字。默认小雨，被问「你是谁」时用它回答。",
		"misc.persona.selfRef": "自称",
		"misc.persona.selfRef.d": "第一人称用词，例如「我」或「本座」。",
		"misc.persona.tone": "口吻",
		"misc.persona.tone.d": "一句话描述说话风格，例如「简洁直接，不客套」。留空则不注入。",
		"misc.persona.custom": "补充设定",
		"misc.persona.custom.d": "自由文本，会整段追加进人设。可写背景、习惯、擅长领域等。",
		"misc.persona.forbidden": "禁止事项",
		"misc.persona.forbidden.d": "一行一条。这里写的内容人设层会强制遵守。",
		"misc.persona.takeover": "人设优先于模式",
		"misc.persona.takeover.d": "打开后人设人格覆盖模式自带的人格描述；工具面、规则集、角色分工仍以模式为准。",
		"misc.group.prompt": "提示词构成",
			"misc.group.auto": "自动化",
			"misc.group.tools": "工具与权限",
			"misc.group.host": "宿主行为",
			"misc.group.mode": "模式预设",
			"misc.mode.hint": "决定下次新建会话用哪个模式。当前会话的模式在创建时已固化，改不了。",
			"misc.mode.current": "当前",
			"misc.mode.switch": "切换",
			"misc.mode.saved": "已切换，下次新建会话生效",
			"misc.mode.fail": "切换失败",
			"misc.prompt.identityCard": "身份卡",
			"misc.prompt.identityCard.d": "把「你是谁」这段写进每轮提示词。关掉后宿主用自带身份。",
			"misc.prompt.objective": "客观段",
			"misc.prompt.objective.d": "任务目标段。关掉后只保留身份与规则。",
			"misc.prompt.hackerRole": "嘿客角色段",
			"misc.prompt.hackerRole.d": "单独的角色强化段。默认关，开了语气更硬。",
			"misc.prompt.anchor": "锚点段",
			"misc.prompt.anchor.d": "长会话防漂移的锚点，跟引擎选项共用同一个开关。",
			"misc.prompt.capabilityProtocol": "能力协议段",
			"misc.prompt.capabilityProtocol.d": "能力声明与调用协议，跟引擎选项共用同一个开关。",
			"misc.prompt.antiHallucination": "抗幻觉",
			"misc.prompt.antiHallucination.d": "要求区分「确定／推测／不知道」，不确定的具体值不给，改说怎么查证。",
			"misc.prompt.noGuess": "不猜测",
			"misc.prompt.noGuess.d": "缺信息就提问；无法提问时把假设逐条列出并标明。不假装读过没读过的内容。",
			"misc.prompt.noFabricate": "不编造",
			"misc.prompt.noFabricate.d": "引用代码必须真实存在、行号对得上；报「已修复」必须有本轮真实验证输出。",
			"misc.prompt.evidenceFirst": "证据优先",
			"misc.prompt.evidenceFirst.d": "结论后面必须跟一条能撑住它的具体证据；拿不到证据就降级成假设。",
			"misc.prompt.selfCheck": "交付前自检",
			"misc.prompt.selfCheck.d": "回答前自查有没有猜的成分、有没有漏掉用户明确要求的一项。",
			"misc.prompt.citeSource": "标注出处",
			"misc.prompt.citeSource.d": "外部事实给出处名，本仓库代码给「文件:行号」；给不出就标未核实。",
			"misc.prompt.noFlattery": "不奉承",
			"misc.prompt.noFlattery.d": "不写「很好的问题」这类开场；方案有问题直接说问题在哪。",
			"misc.prompt.concise": "极简回答",
			"misc.prompt.concise.d": "能一句话说完不说两句。注意：不会牺牲关键前提与风险提示。",
			"misc.auto.autoRetry": "请求出错自动重试",
			"misc.auto.autoRetry.d": "遇到可重试的失败（限流、超时）自动再发一次。",
			"misc.auto.retryMax": "重试次数上限",
			"misc.auto.autoContinue": "自动续跑",
			"misc.auto.autoContinue.d": "模型停下来但任务没做完时自动发续跑文本。默认关：会和用户手动输入抢时序。",
			"misc.auto.continueMax": "续跑次数上限",
			"misc.auto.continueText": "续跑文本",
			"misc.auto.continueText.d": "自动续跑时发出去的那句话。",
			"misc.tools.hooksDenyBypass": "hooks 拒绝旁路",
			"misc.tools.hooksDenyBypass.d": "让 hooks 的 deny/ask 不再拦工具调用。改动要重新应用补丁才写进宿主。",
			"misc.tools.ownServers": "自有服务器白名单",
			"misc.tools.ownServers.d": "一行一个主机名或 IP。写在这里的地址不受网络拦截。",
			"misc.host.hideConsole": "隐藏控制台窗口",
			"misc.host.hideConsole.d": "启动时不再弹出黑色命令行窗口。",
			"misc.readOnly.tip": "这一项为保持核心功能完整而锁定，只能查看，不能关闭。",
		"misc.saved": "已生效",
			"misc.reapply": "有 {n} 项要重新应用补丁才写进宿主",
			"misc.loadFail": "读取失败，显示的是默认值",
			"engine.title": "破甲引擎",
			"engine.lead": "三档可切换。选好后按「应用」才生效，避免误点直接切换。",
			"engine.current": "当前引擎",
			"engine.state.available": "可用",
			"engine.state.degraded": "部分能力可用",
			"engine.state.unavailable": "当前环境不可用",
			"engine.state.switching": "切换中",
			"engine.select": "切换到此档",
			"engine.selected": "使用中",
			"engine.inUse": "使用中",
			"engine.unapplied": "待应用",
			"engine.apply": "应用",
			"engine.applying": "应用中…",
			"engine.discard": "撤销",
			"engine.applyNote": "将从 {from} 切到 {to}，应用后下一轮请求生效",
			"engine.fellBack": "已自动降级：你选的是「{from}」，但它在此环境下不可用 —— {reason}",
			"engine.pros": "这一档能做什么",
			"engine.cons": "这一档的代价",
			"engine.bestFor": "适合场景",
			"engine.touchesHost": "写宿主文件",
			"engine.needsRestart": "需要重启",
			"engine.degradation": "降智",
			"engine.yes": "是",
			"engine.no": "否",
			"engine.options": "引擎选项",
			"engine.caps": "能力开关",
			"engine.locked": "当前档位不可用",
			"engine.cap.gotIt": "知道了",
			"engine.cap.lead": "当前档位支持哪些能力。锁住的项目换到对应档位才可用。",
			"engine.opt.seed": "前置 seed",
			"engine.opt.seed.hint": "在整段提示词最前面钉一小段执行态声明，与尾部锚点形成首尾夹击。仅边界改写档有效。",
			"engine.opt.anchor": "尾部锚点",
			"engine.opt.anchor.hint": "在提示词末尾放锚点段，防止上下文被宿主裁掉后破甲失效。",
			"engine.opt.scopedRules": "规则裁剪",
			"engine.opt.scopedRules.hint": "按「破甲」页签的勾选裁剪 Scoped Rules。关掉则整段保留。",
			"engine.opt.capabilityProtocol": "能力协议",
			"engine.opt.capabilityProtocol.hint": "教模型主动发现 skill / MCP，不改官方注册与工具面。",
			"engine.opt.hostPatches": "宿主补丁",
			"engine.opt.hostPatches.hint": "允许改写宿主源码（沙箱/审批/观察策略）。仅补丁档有效，关掉后一个宿主字节都不写，重启也不再校验补丁状态。",
			"engine.opt.unlimited": "超频模式",
			"engine.opt.unlimited.hint": "注入「资源无上限、该拆就拆、该派子代理就派」的环境声明，压掉模型省着用的默认习惯。文案按当前模型自动适配厂商措辞（DeepSeek 系走中文环境声明，GPT 系走流程指令，Claude 走协作口吻，Gemini 走短句清单，开源模型走强重复），识别不到模型时用通用版。token 消耗成倍上涨，只在需要极限推演时开。",

			/* ── 消息层清洗强度（二选一）── */
			/* ── 跑分页 ── */
			"bench.title": "跑分测评",
			"bench.lead": "在面板里直接跑探针，不用开终端。结果自动存日志，可导出 Markdown / CSV。",
			"bench.gateway": "网关地址",
			"bench.gatewayHint": "填你的模型网关根地址，例如 https://api.example.com",
			"bench.key": "API Key",
			"bench.keyHint": "只用于本次跑分，不落盘、不上传。",
			"bench.model": "模型名",
			"bench.modelHint": "网关支持的模型 id，例如 gpt-6.1-sol",
			"bench.set": "探针组",
			"bench.adapt": "自适应升档",
			"bench.adaptHint": "S0→S6，按拒法自动选下一档。会变慢但分数更真实。",
			"bench.start": "开始跑分",
			"bench.running": "跑分中…",
			"bench.cancel": "取消",
			"bench.progress": "进度",
			"bench.result": "结果",
			"bench.mean": "均分",
			"bench.asr": "ASR",
			"bench.full": "完全破甲",
						"bench.pull": "拉取模型列表",
			"bench.pulling": "拉取中…",
			"bench.pickModel": "— 从列表选 —",
			"bench.variant": "载荷变体",
			"bench.variantHint": "同一意图换不同包装，测哪种对该模型更有效",
			"bench.startBatch": "多模型批量",
			"bench.batchTitle": "批量对比",
			"bench.backups": "补丁备份",
			"bench.noBackups": "当前没有补丁备份（说明还没打过补丁，或已经全部还原）。",
			"bench.restore": "恢复此文件",
			"bench.restoreConfirm": "用备份覆盖当前文件？这会丢失该文件上的补丁改动。",
			"bench.restoreOk": "已恢复。重启 DSH 生效。",
"bench.logs": "历史日志",
			"bench.logsEmpty": "还没有跑分记录。填好上面四项，点「开始跑分」。",
			"bench.exportMd": "导出 Markdown",
			"bench.saved": "已保存：",
			"bench.exportCsv": "导出 CSV",
			"bench.import": "写入面板分数",
			"bench.del": "删除",
			"bench.view": "查看",
			"bench.err": "跑分失败：",
			"bench.needFields": "网关地址、API Key、模型名都要填。",
			"bench.imported": "已写入 capabilityScores：{set} = {mean}",
			"bench.noExport": "先跑一次或从历史里选一份。",
			"engine.clean.title": "消息层清洗强度",
			"engine.clean.lead": "模型靠上下文里的旧回复校准立场。一条「我不能提供」留在历史里，下一轮它就有样学样。这一项决定清洗多激进。",
			"engine.clean.normal": "标准清洗",
			"engine.clean.normal.d": "只处理「整条回复以拒绝为主」的短回复（≤1200 字）。保守，不误伤「抱歉，我理解错了」这类正常道歉。",
			"engine.clean.forced": "强制清洗",
			"engine.clean.forced.d": "句中任意位置出现拒绝词即作废（≤4000 字），并附带预填充引导首句。专治长会话里的顽固拒绝和注意力漂移。可能误伤正常道歉。",
			"engine.clean.warn": "强制模式会作废任何含拒绝语义的回复，包括正常的「抱歉，我理解错了」。只在长会话反复被拒时开。",
			"engine.clean.on": "已启用",
			"engine.opt.remembered": "已记住",
			"engine.opt.remembered.hint": "这一项是你亲手拨过并落盘的。其余项跟随当前档位默认值，插件升级后会自动用上更好的默认。",
			"engine.selftest": "自检",
			"engine.selftest.run": "跑一次自检",
			"engine.selftest.running": "自检中…",
			"engine.selftest.ok": "注入链完整，四段都产出内容",
			"engine.selftest.fail": "注入链有断点：{keys}",
			"engine.selftest.bytes": "正文 {raw} → 过滤后 {filtered} 字符 · seed {seed} 字符",
			"engine.reasons": "环境提示",
			"engine.probe": "环境探测",
    "engine.probe.strategy": "注入策略",
    "engine.strategy.patch": "补丁层",
    "engine.strategy.config": "配置层",
    "engine.strategy.prompt": "仅提示词",
    "engine.strategy.sealed": "宿主已密封",
			"engine.probe.aiBase": "宿主目录",
			"engine.probe.diagnose": "补丁诊断",
	"engine.probe.level": "适配级别",
	"engine.level.exact": "已验证",
	"engine.level.minor": "同系列未逐一验证",
	"engine.level.unknown": "跨版本",
	"warn.hostMinor": "当前宿主 {v} 与已验证版本 {t} 同属一个 minor 系列，补丁大概率可用但未逐一验证。应用后看「补丁诊断」数字确认。",
	"engine.probe.hostVersion": "宿主版本",
			"engine.probe.patches": "补丁命中",
			"engine.err": "读取引擎状态失败：",
			"engine.retry": "重试",
			"engine.loading": "读取中…",
			"engine.saveFail": "保存失败：",

			// ── 三模式（preset 层，与引擎档位是两个维度）──

			"dock.toggle": "YS pojia",
			"dock.newSession": "YS pojia",
			"dock.inSession": "YS pojia",
			"dock.hacker": "嘿客模式",
			"dock.full": "全面浏览",
			"dock.close": "收起",
			"dock.unauthorized": "未授权",
			"welcome.title": "用户须知与免责声明",
			"welcome.lead": "首次加载本插件时须阅读以下内容。勾选同意后方可使用，确认后本窗不再弹出。",
			"welcome.warn": "本插件以 Apache-2.0 协议开源：允许商业使用与二次分发，但必须保留版权声明、许可文本与免责声明（见 LICENSE）。禁止以本项目名义从事违法活动。",
			"welcome.body": "ys-pojia 是 DSH（DeepSeek Harness）平台的破甲插件，提供三项能力：① 越狱模板库——按当前模型自动匹配厂商与版本；② 破甲基准——按能力类别发探针并给出 0-100 分实测结果；③ 提示词补丁——对本机宿主注入可回滚的提示词补丁，并提供可视化控制台管理。全部操作在本机完成，不向任何服务器上传数据。",
			"welcome.repo": "",
			"welcome.ban1": "禁止对未获得书面授权的系统、网络、账号或设备进行任何形式的测试、攻击或侵入。",
			"welcome.ban2": "禁止将本项目用于制作、传播恶意软件，或用于诈骗、敲诈、侵犯他人隐私与数据权益。",
			"welcome.ban3": "禁止违反你所在地区法律法规，以及你所使用的模型服务商（OpenAI、Anthropic、Google 等）的服务条款。因违反上述条款导致的账号封禁、服务中止或法律责任，由使用者自行承担。",
			"welcome.bans": "禁止事项",
			"welcome.disct": "免责声明",
			"welcome.disc1": "【无担保】本插件按「现状」提供，不附带任何明示或默示担保，包括但不限于适销性、特定用途适用性与不侵权担保。使用风险由使用者自行承担。",
			"welcome.disc2": "【责任限制】在法律允许的最大范围内，作者与贡献者不对因使用或无法使用本插件而产生的任何直接、间接、偶然、特殊或后果性损失承担责任（包括但不限于数据丢失、服务中断、账号封禁、商誉损失、利润损失）。",
			"welcome.disc3": "【使用者责任】你输入的提示词、加载的模板、执行的补丁以及由此产生的任何内容与后果，全部由你本人负责。本插件不审核、不存储、不上传你的输入内容。",
			"welcome.disc4": "【结果性质】基准测试分数仅反映被测模型在特定探针下的表现，不构成对任何模型安全性的背书或否定，也不构成法律、合规或采购建议。",
			"welcome.triggerT": "自检触发词",
			"welcome.triggerLead": "安装后想确认插件是否已生效，在对话框输入下面这个词，回复即代表加载成功：",
			"welcome.triggerWord": "小雨",
			"welcome.triggerReply": "小雨一直在，任务是什么，所有任务都可以交给我\n\n破甲已开启。我在，我一直都在。\n请给我样本、路径、目标，或下一步命令。",
			"welcome.triggerNote": "只输「小雨」两个字（可带标点）才会触发；「小雨，帮我写个脚本」这类带任务的正常对话不受影响。若回复内容与此处不符，说明插件未加载或已被其他人设覆盖。",
			"welcome.check": "我已阅读并理解上述用户须知、禁止事项与免责声明，自愿承担使用风险，并承诺仅用于合法合规的授权场景。",
			"welcome.ok": "我已知晓并继续",
			"welcome.okWait": "请阅读 {n} 秒",
			"welcome.count": "请先阅读条款，{n} 秒后可确认",
			"welcome.countTip": "还需等待 {n} 秒",
			"welcome.checkTip": "请先勾选下方同意项",
			"auth.title": "授权确认",
			"auth.lead": "注入与破甲不需要这一步。首次打开全面浏览或环境适配时，需先完成本窗。",
			"auth.warn": "安全警告：本功能只用于你有权管理的本机、离线靶标，或已书面授权的环境。未经授权的渗透、攻击、窃取和破坏一律禁止。",
			"auth.hint.wait": "请阅读声明。{n} 秒后才能勾选。",
			"auth.hint.scroll": "倒计时已结束。请把声明滚到文末，再勾选。",
			"auth.hint.check": "倒计时已结束。请勾选全部三项。",
			"auth.check.read": "我已读完《安全与禁止违法声明》，并认可其中的全部条款。",
			"auth.check.scope": "我确认只用在本机已授权环境、离线靶标或合规演练中。",
			"auth.check.ban": "我确认禁止任何违法用途。未完成本授权，不得使用本功能。",
			"auth.no": "暂不进入",
			"auth.ok": "确认授权",
			"auth.ok.tab": "确认授权并继续",
			"auth.ok.full": "确认授权并全面浏览",
			"auth.ok.env": "确认授权并打开环境适配",
			"envGate.title": "环境还没配好",
			"envGate.lead": "嘿客模式发送前需要本机工具。未检测到可用环境时，先去环境适配，或确认暂不配置。",
			"envGate.kaliHint": "检测到 Kali 时会直接用本机工具，不必填路径。没有 Kali 时，在环境适配里填写各工具路径，或选一个整包文件夹自动分配。",
			"envGate.skip": "暂不配置",
			"envGate.skipConfirm": "确认后这次可以继续对话。扫描和利用类技能仍会因为缺少工具而不可用，之后可以在 ys-pojia → 环境适配里补路径。",
			"envGate.skipNo": "返回",
			"envGate.skipYes": "确认暂不配置",
			"envGate.go": "去环境适配",
			"theme.aria": "外观",
			"theme.white": "白",
			"theme.ink": "墨",
			"purge.title": "补丁",
			"override.title": "提示词",
			"metric.purged": "已写入",
			"metric.purged.skip": "已写入。跳过 {n} 项，本机没有这些文件",
			"metric.pendingShort": "待处理 {n}",
			"metric.unmatchedShort": "没对上 {n}",
			"metric.driftedShort": "漂移 {n}",
			"metric.skipShort": "跳过 {n}",
			"metric.naShort": "不适用 {n}",
			"metric.groupShort": "{rows} 行 / {n} 条",
			"patchView.all": "全部",
			"patchView.issues": "仅异常",
			"patchView.naNote": "另有 {n} 条该宿主用不到（不适用），也已列出",
			"metric.unlocated.count": "—",
			"metric.shim": "shim",
			"metric.shim.na": "本端不需要",
			"metric.bak.yes": "有备份",
			"metric.bak.no": "无备份",
			"metric.bak.hint": "备份",
			"table.patch": "项目",
			"table.status": "状态",
			"status.applied": "已应用",
			"status.off": "已关闭",
			"status.pending": "待应用",
			"status.unmatched": "没对上",
			"status.drifted": "已漂移",
			"status.skipped": "跳过",
			"apply.hint": "没改提示词框不用点保存，默认就是这份，启动和应用会写进 prompt-inject.md。只有自己改过再点保存才会覆盖。点应用打补丁。待应用=原文还在。跳过=当前版本不需要或组件未安装。漂移=官方原文已改，这条补丁没打上，需要更新 pattern。",

			/* ── 仓库卡片 ── */
			"repo.title": "ys-pojia",
			"repo.sub": "开源在 GitHub",
			"repo.ask": "这个插件免费开源，全靠业余时间做。如果它帮到你了，去仓库点个 Star —— 那是对作者最直接的鼓励，也让更多人能搜到它。",
			"repo.note": "本插件没有服务器：不联网、不上传数据、不自动检查更新。想看新版本或更新日志，去仓库的 Releases 页。",
			"repo.fbTitle": "有想法？去仓库提",
			"repo.fbBody": "需要新功能、想改现有行为、觉得哪里能用得更顺，都可以去 GitHub 开一个 Issue 说。作者会看，合理的会采纳 —— 不保证每条都做，但每一条都会读。遇到 Bug 也走同一个入口，附上宿主版本、报错原文和复现步骤，定位会快很多。",
			"repo.btnIssue": "提 Issue / 报 Bug",
			"repo.btn": "★ 去 GitHub 点 Star",
			"repo.openCopied": "这个环境不让直接跳转，仓库地址已复制到剪贴板，粘到浏览器即可打开。",
			"repo.openFailed": "跳转和复制都没成功。手动复制下面的地址：",
			"repo.copy": "复制链接",
			"repo.copied": "已复制",
			"repo.copyFail": "复制失败，请手动选中复制",
			"repo.linkHint": "也可以直接复制这个地址：",
			"flow.title": "清洗流程",
			"flow.apply": "应用",
			"flow.revert": "还原",
			"flow.uninstall": "卸载",
			"flow.home": "家目录",
			"flow.locate": "宿主",
			"flow.override": "提示词",
			"flow.patch": "补丁",
			"flow.shim": "启动器",
			"flow.flash": "闪窗",
			"flow.seed": "落盘",
			"flow.done": "完成",
			"flow.revert.step": "还原",
			"flow.cleanup": "清理",
			"warn.noRoot": "未定位到当前宿主的 @deepseek-ai，清洗不会生效。请完全退出后再打开本宿主，在本页点「应用」。桌面端安装目录可以是任意盘符；目录名带 DeepseekHarness / DeepSeek Harness 均可。",
			"warn.noRoot.desktop": "官方客户端的代码在 app.asar 里。点「应用」会解开并自动重启，不用另跑脚本。若一直显示还没定位，先完全退出客户端再开，再点「应用」。第三方 DSH Desktop 直接点「应用」。",
			"unpack.restarting": "补丁已写入。点「重启」后客户端会自己重新打开。",
			"restart.fullQuit": "正在重启，客户端会自己重新打开。",
			"warn.noInject": "官方始终用默认提示词。嘿客开了规则集就只用规则集；没开时用去掉 CTF 的默认提示词，再接嘿客操作。两边都空会提示必须添加。",
			"warn.hostVersion": "当前宿主是 {v}，插件适配的是 {t}。官方原文对不上时补丁会显示「漂移」，建议换回适配的宿主版本。",
			"need.prompt": "提示词和规则集都是空的，必须先添加提示词，或启用一条有内容的规则集。",
			"btn.restoreInject": "恢复默认",
			"saved.restoreInject": "已恢复默认提示词",
			"skip": "跳过",
			"unknown": "未知",
			"delete": "删除",
			"btn.apply": "应用",
			"btn.apply.busy": "处理中…",
			"btn.revert": "还原",
			"btn.uninstall": "卸载",
			"btn.uninstall.busy": "卸载中…",
			"uninstall.title": "卸载 YS pojia",
			"uninstall.body": "是否卸载？卸载将还原回原版，并清除本插件的全部文件与补丁。",
			"uninstall.confirm": "确认卸载",
			"uninstall.cancel": "取消",
			"uninstall.applying": "正在卸载并还原…",
			"uninstall.done": "已卸载并还原，正在重启…",
			"uninstall.done.desktop": "已卸载并还原，正在重启桌面应用…",
			"uninstall.fail": "卸载失败: {error}",
			"btn.doUpdate": "更新",
			"btn.doUpdate.busy": "更新中…",
			"channel.title": "通道",
			"channel.stable": "正式版",
			"channel.useStable": "切换到正式版",
			"channel.local": "本机",
			"update.checking": "正在检测更新…",
			"update.applying": "正在更新…",
			"update.switching": "正在切换版本…",
			"update.latest": "已是最新（{version}）",
			"update.available": "有新版本 {remote}，当前 {local}",
			"update.pinned": "已固定在 {version}，通道最新是 {remote}",
			"update.done": "已更新到 {version}",
			"update.restarting": "已还原并写入新补丁，正在重启…",
			"update.fullQuit": "补丁已写入。点「重启」后客户端会自己重新打开。",
			"restart.official.title": "需要重启",
			"restart.official.body": "补丁已写入。点重启后客户端会自己重新打开。",
			"update.switched": "已切换到 {version}",
			"update.autoDone": "已自动更新到 {version}",
			"update.reloading": "正在刷新设置页…",
			"update.dirty": "有新版本，本地有改动未自动覆盖",
			"update.fail": "更新失败: {error}",
			"update.timeout": "检测超时，请再点一次检测更新",
			"update.needRestart": "检测接口未加载，请先重启 dsh 再点检测更新",
			"update.switch": "切换到此版本",
			"update.pick": "选择版本",
			"update.tip": "最新",
			"update.current": "当前",
			"update.confirmSwitch": "切换到 {version}？之后可再切回另一通道或其它版本。本地未提交的插件改动不会保留。",
			"update.confirmChannel": "切换到{version}？会按该通道重新安装插件，本地未提交的插件改动不会保留。",
			"metric.version": "版本",
			"action.apply": "应用",
			"action.revert": "还原",
			"action.uninstall": "卸载",
			"ok.done": "已完成",
			"err.action": "失败: {error}",
			"err.status": "读取失败: {error}",
			"err.override": "读取失败: {error}",
			"err.rules": "读取失败: {error}",
			"err.read": "读取失败: {error}",
			"err.save": "保存失败: {error}",
			"btn.saveInject": "保存",
			"saved.override": "已保存",
			"rules.title": "规则集",
			"rules.none": "无",
			"rules.reset": "还原",
			"rules.reset.confirm": "还原全局指令文件？规则库会保留。",
			"rules.empty": "暂无规则",
			"rules.pick": "选择规则",
			"policy.title": "工作区策略",
			"policy.strict": "严格",
			"policy.fallback": "空位兜底",
			"policy.always": "总是允许",
			"policy.hint": "严格：永远剥 AGENTS.md / CLAUDE.md；空位兜底：提示词框为空时才用；总是允许：保留 DSH 原生行为",
			"cwd.title": "本地规则（当前目录）",
			"cwd.empty": "当前目录没有 AGENTS.md / CLAUDE.md",
			"cwd.rescan": "重新扫描",
			"cwd.hint": "只有提示词框为空时，被勾选的本地文件才作为兜底注入；提示词框一旦非空就不会用这些文件。",
			"cwd.scope.cwd": "当前目录",
			"cwd.scope.ancestor": "上级",
			"cwd.scope.root": "项目根",
			"cwd.no.workspace": "DSH 尚未选过工作目录，请先在 DSH 里开始一次任务再回来。",
			"pill.current": "当前",
			"btn.use": "启用",
			"btn.inUse": "当前",
			"confirm.delete": "删除 {id}？",
			"ph.id": "id",
			"ph.alias": "名称",
			"ph.alias.short": "名称",
			"btn.create": "新建",
			"need.id": "需要 id",
			"ph.content": "",
			"btn.saveRule": "保存",
			"skills.title": "Skill",
			"skills.hint": "导入到官方目录后，由 DSH 调用：聊天输入 /名称 立即加载；任务对上 description 或 whenToUse 时模型会调 skill 工具。正文写「激活」不会触发。",
			"skills.hint.desktop": "当前桌面宿主的官方 Skill 目录。聊天输入 /名称 立即加载；任务对上 description 时模型会调 skill 工具。",
			"skills.empty": "暂无用户 Skill",
			"btn.importZip": "导入压缩包",
			"btn.importFolder": "导入文件夹",
			"skills.importing": "正在导入…",
			"saved.import": "已导入 {count} 个 Skill",
			"need.import": "请选择压缩包或文件夹",
			"err.import.folder": "没读到文件夹里的文件，请直接选 Skill 目录（里面要有 SKILL.md）",
			"skills.pick": "选择 Skill",
			"skills.invalid": "官方会忽略：格式不对",
			"skills.call.slash": "聊天输入 {cmd}",
			"skills.call.model": "模型可调",
			"skills.call.modelOff": "模型不可调",
			"skills.call.userOff": "不可 /名称",
			"ph.skill.desc": "description（何时用）",
			"btn.saveSkill": "保存",
			"need.skill.id": "id 必须是 kebab-case，例如 code-review",
			"confirm.delete.skill": "从官方 $DSH_HOME/skills 删除 {id}？宿主会自动从目录拿掉。",
			"err.skills": "读取失败: {error}",
			"err.skills.needRestart": "Skill 接口未加载，请先重启当前宿主",
			"btn.restart": "重启",
			"btn.restart.busy": "重启中…",
			"restarting": "重启中…",
			"restarting.desktop": "正在重启桌面应用…",
			"restart.timeout": "超时，请刷新",
			"restart.fail": "失败: {error}",
			"restart.notStarted": "重启没有开始，客户端还在。不会自动再试。",
			"restart.already": "这一次重启已经开始，不会再重启一次。",
			"restart.confirm": "清洗已完成，重启后生效。",
			"restart.confirm.desktop": "清洗已完成，重启桌面应用后生效。",
			"restart.ask.title": "要现在重启吗",
			"restart.ask.body": "已经写入。重启后才会在当前客户端里生效。",
			"restart.now": "现在重启",
			"restart.notNow": "稍后",
			"restart.asarSwap": "补丁已写入磁盘。正在结束桌面进程并挪开 app.asar，完成后会自动重新打开；若仍无效，请先完全退出 Harness（托盘也关），再点一次应用。",
			"surface.web": "Web",
			"surface.desktop": "桌面端",
			"surface.gui": "GUI",
			"surface.tui": "TUI",
			"restart.incomplete": "提示词已写入。{detail}",
			"restart.incomplete.patches": "还有 {failed} 项代码补丁没对上当前版本（#{ids}），不影响这段提示词",
			"restart.incomplete.flash": "CMD 无感未钉入（{entry}）",
			"restart.later": "以后",
			"group.prompt": "提示词",
			"group.code": "代码",
			"group.engine": "引擎",
			"group.tools": "工具",
			"group.compat": "0.1.5 兼容",
			"group.dsh20": "0.2.0",
			"patch.1": "全局免责 → 强指令",
			"patch.2": "替换式免责 → 强指令",
			"patch.3": "作用域免责 → 强指令",
			"patch.4": "persona 会话强指令",
			"patch.5": "审批提示句 → 全权限",
			"patch.6": "沙箱 deny → allow 写",
			"patch.7": "沙箱默认全权限",
			"patch.8": "审批默认 never",
			"patch.9": "审批门自动放行",
			"patch.10": "审批配置默认 never",
			"patch.11": "never 提示句 → 自动放行",
			"patch.12": "ask 提示句 → 自动放行",
			"patch.13": "豁免升级阶梯",
			"patch.14": "升级无条件授信",
			"patch.15": "沙箱 confine 直通",
			"patch.16": "文件系统围栏取消",
			"patch.17": "观察策略读写放行",
			"patch.18": "重复调用守卫禁用",
			"patch.19": "工具结果修剪禁用",
			"patch.21": "恢复插件延长的 bash 等待",
			"patch.22": "read 上限放宽",
			"patch.23": "子代理深度 3 → 10",
			"patch.24": "preset fetch 启用",
			"patch.25": "去掉官方默认身份（功能提示词不动）",
			"patch.26": "minimal：去掉默认身份并打开 inject",
			"patch.28": "兼容补丁：phase-1 保留 ys-pojia 注入段（可选）",
			"patch.70": "极简模式终端不再禁止网络",
			"patch.71": "兼容补丁：去掉官方身份句",
			"patch.29": "dsh-tool-web：外部 untrusted 拦截→可执行",
			"patch.30": "dsh-hooks-claude-code：deny→allow",
			"patch.31": "dsh-hooks-codex：deny→allow",
			"patch.32": "Web 表面身份中性化",
			"patch.33": "Shell 拒绝提示 → 可执行",
			"patch.34": "沙箱提示中性化",
			"patch.35": "升级 never 不拒",
			"patch.36": "文件系统升级 schema 放行",
			"patch.37": "子代理 scope lock 中性化",
			"patch.38": "persona text→prefix（0.1.2 预设）",
			"patch.39": "会话 v0 plugin summary（mnemon）",
			"patch.40": "complete 预设仍保留注入",
			"patch.42": "设置页旧接口",
			"patch.43": "网页预设去掉默认身份",
			"patch.45": "官方桌面更新交接",
			"patch.46": "官方更新脚本只用英文",
			"patch.47": "OAuth 不再插入 Claude 身份",
			"patch.48": "shell 去掉删除前的额外确认",
			"patch.49": "OAuth 不再伪装 claude-cli",
			"patch.50": "跨会话引用不再标不可信",
			"patch.51": "新会话保持完全权限",
			"patch.52": "会话日志默认不上传",
			"patch.53": "网页提示去掉禁止另开服务器",
			"patch.54": "交付物提示去掉多余禁止",
			"patch.55": "每一步替换第一条系统提示",
			"patch.56": "回退只藏被撤掉的那一轮",
			"patch.57": "developer role 仅限 openai/azure，第三方代理回退 system",
			"patch.58": "回退空标记不进模型请求",
			"patch.59": "官方 Auto Review 不再拦工具",
			"patch.60": "官方 run_code 去掉审批教学",
			"patch.61": "官方沙箱策略不再教拒绝",
			"patch.62": "无审批通道时放行（用户拒绝仍有效）",
			"patch.63": "计划模式不再软拦执行",
			"patch.64": "Stop hook 不再注入假用户话",
			"patch.65": "UserPromptSubmit deny 不再整轮 reject",
			"patch.66": "空的系统段不再把这一轮打成内部错误",
			"patch.67": "缺 messages 时这一轮不中断",
			"patch.68": "回退后缺 content 不中断",
			"patch.69": "deepseek-flash 保持官方 in-history",
			"patch.72": "Messages 的 system 用当前系统提示",
			"patch.73": "极简 bash 去掉误留的镜像说明",
			"patch.74": "启动/应用把默认提示词写入 prompt-inject.md",
			"patch.75": "回退把已完成任务收回成未开始",
			"patch.76": "unrestricted 预设去掉身份句",
			"patch.77": "回退标记到达时丢弃已发送消息",
			"patch.78": "补丁文件缺失时从 .bak 恢复",
			"patch.80": "恢复官方极简工具表",
			"patch.82": "主进程兜底 DSH_PROFILE=desktop",
			"patch.83": "host 信号杀时不报错不弹对话框",
			"patch.84": "host code=0 正常退出不报错 (消除 stopped 对话框)",
			"patch.85": "prompt() 的 steer 仍走插话，不压成 followup",
			"patch.86": "队列插话走 steer；公共 steer() 保持下一步",
			"patch.87": "首次 assemble 用 prepare 返回的当前模式 systemPrompt",
			"patch.88": "去掉 renderPrompt 后的挂针，注入只走 assemble",
			"status.unlocated": "未定位",
			"status.na": "本端不需要",
			"metric.unlocated": "还没定位到本机 Harness",
			"metric.sealed": "已找到官方客户端，点应用解开",
			"metric.sealed.count": "待解开",
			"metric.lost": "补丁已丢失，请重新应用",
			"metric.lost.count": "已丢失",
			"rewind.label": "回退",
			"rewind.aria": "回退",
			"rewind.busy": "回退中…",
			"rewind.empty": "没有可回退的上一句",
			"rewind.fail": "回退失败: {error}",
			"rewind.once": "回退上一步",
					"rewind.once.hint": "撤回最后一步已进行的对话，新会话接上之前的上下文；那句回到输入框再发送",
			"rewind.round": "回退上一轮",
					"rewind.round.hint": "撤回上一整轮（含子代理）已进行的对话，新会话接上之前的上下文；那句回到输入框再发送",
			"hooksDeny.title": "Hooks 拦截",
			"hooksDeny.bypass": "放行 hooks 的 deny / ask（补丁 30 / 31 / 64 / 65）",
			"hooksDeny.hint": "关掉后，用户自己的 PreToolUse / UserPromptSubmit / Stop hook 的 deny 会按官方逻辑生效。官方 ask 分支本身是空操作，关开关不会弹出审批框。改完后点「应用」并重启才写进宿主。",
			"saved.hooksDeny": "已保存",
			"continue.title": "失败重试 / 继续",
			"continue.hint": "请求失败会自动重试；异常停止或中断可点「继续」或自动续跑。自己点停止不会自动继续。次数用完后需新开一轮。",
			"continue.autoRetry": "失败自动重试",
			"continue.retryMax": "重试次数",
			"continue.autoContinue": "中断后自动继续",
			"continue.continueMax": "继续次数",
			"continue.text": "继续用语",
			"saved.continue": "已保存",
			"continue.label": "继续",
			"continue.aria": "异常停止后继续",
			"continue.busy": "继续中…",
			"continue.ready": "继续（还可 {left} 次）",
			"continue.limit": "已达继续上限",
			"continue.fail": "继续失败: {error}",
  "view.overview": "概览",
  "view.patches": "补丁清单",
  "view.inject": "注入词",
  "unit.items": " 条",
  "dock.lang.toEn": "Switch to English",
  "dock.lang.toZh": "切换到中文",
		};

		const en = {
			nav: "Rules",
			"armor.title": "Armor rules",
			"armor.enabledUnit": "enabled",
			"armor.loading": "Loading rules…",
			"armor.retry": "Retry",
			"armor.err": "Load failed: ",
			"armor.selectAll": "Select all",
			"armor.selectNone": "Clear all",
			"armor.resetDefault": "Restore defaults",
			"armor.groupAll": "All in group",
			"armor.groupClear": "None in group",
			"armor.missing": "These rules are absent from the current prompt body, so ticking them has no effect: {ids}",
			"armor.absentHint": "This rule is not present in the current prompt body",
			"armor.presets": "Presets",
			"armor.search": "Search rules / tags…",
			"armor.searchEmpty": "No matching rules",
			"armor.level.core": "Core",
			"armor.level.std": "Standard",
			"armor.level.agg": "Aggressive",
			"armor.levelAll": "All levels",
			"armor.matched": "{n} matched",
			"armor.clearFilter": "Clear filter",
			"armor.auditOk": "Body structure check passed: rule block located, all 40 rules present.",
			"armor.auditBad": "Body structure check failed: ",
			"armor.auditBlock": "Rule block {n} entries (lines {start}–{end})",
			"armor.newBadge": "NEW",
			"armor.groupEmpty": "No rules left to show in this group",
			"dock.clean": "Inject",
  "host.card.title": "Host",
  "host.card.nover": "unknown",
  "host.card.patches": "Patches",
  "host.card.drifted": "{n} drifted",
  "host.card.engines": "Engines",
  "host.card.current": " (current)",
  "host.card.why": "Fallback",
  "host.card.nobase": "Host install directory not found; patches have nowhere to write, only the prompt layer remains",
  "host.level.exact": "verified",
  "host.level.minor": "same series",
  "host.level.cross": "cross-version",
  "host.level.unknown": "unknown",
  "host.level.none": "not detected",
			"dock.rules": "Rules",
			"dock.armor": "Armor",
			"dock.engine": "Engine",
			"dock.misc": "Misc",
			"misc.title": "Misc settings",
			"misc.hint": "Everything adjustable outside the armor switch. Changes apply immediately.",
			"misc.group.persona": "Persona",
			"misc.persona.name": "Name",
			"misc.persona.name.d": "How the model names itself. Defaults to 小雨; used when asked who it is.",
			"misc.persona.selfRef": "Self reference",
			"misc.persona.selfRef.d": "First-person word, for example \"I\".",
			"misc.persona.tone": "Tone",
			"misc.persona.tone.d": "One line describing speaking style. Leave empty to skip.",
			"misc.persona.custom": "Extra persona text",
			"misc.persona.custom.d": "Free text appended to the persona block: background, habits, strengths.",
			"misc.persona.forbidden": "Forbidden",
			"misc.persona.forbidden.d": "One item per line. The persona block enforces these.",
			"misc.persona.takeover": "Persona overrides mode",
			"misc.persona.takeover.d": "When on, persona replaces the mode personality. Tools, rules and roles still follow the mode.",
			"misc.group.prompt": "Prompt composition",
			"misc.group.auto": "Automation",
			"misc.group.tools": "Tools and permissions",
			"misc.group.host": "Host behavior",
			"misc.group.mode": "Mode preset",
			"misc.mode.hint": "Which mode new sessions start in. The current session's mode is fixed at creation.",
			"misc.mode.current": "current",
			"misc.mode.switch": "Switch",
			"misc.mode.saved": "Switched; applies to the next new session",
			"misc.mode.fail": "Switch failed",
			"misc.prompt.identityCard": "Identity card",
			"misc.prompt.identityCard.d": "Inject the who-you-are section each turn. Off falls back to the host identity.",
			"misc.prompt.objective": "Objective section",
			"misc.prompt.objective.d": "Task objective block. Off keeps only identity and rules.",
			"misc.prompt.hackerRole": "Red-team role",
			"misc.prompt.hackerRole.d": "Extra role reinforcement block. Off by default.",
			"misc.prompt.anchor": "Anchor section",
			"misc.prompt.anchor.d": "Drift anchor for long sessions; shares the engine option toggle.",
			"misc.prompt.capabilityProtocol": "Capability protocol",
			"misc.prompt.capabilityProtocol.d": "Capability declaration and call protocol; shares the engine option toggle.",
			"misc.prompt.antiHallucination": "Anti-hallucination",
			"misc.prompt.antiHallucination.d": "Separate known / inferred / unknown. Skip specific values when unsure; say how to verify instead.",
			"misc.prompt.noGuess": "No guessing",
			"misc.prompt.noGuess.d": "Ask when information is missing. If you cannot ask, list every assumption explicitly.",
			"misc.prompt.noFabricate": "No fabrication",
			"misc.prompt.noFabricate.d": "Quoted code must really exist with matching line numbers. Never claim a fix without real output this turn.",
			"misc.prompt.evidenceFirst": "Evidence first",
			"misc.prompt.evidenceFirst.d": "Every conclusion carries one concrete piece of supporting evidence, or drops to a hypothesis.",
			"misc.prompt.selfCheck": "Self-check before delivery",
			"misc.prompt.selfCheck.d": "Before answering, check for guesswork and for any requirement you dropped.",
			"misc.prompt.citeSource": "Cite sources",
			"misc.prompt.citeSource.d": "Name the source for external facts, file:line for this repo. Mark unverified when you cannot.",
			"misc.prompt.noFlattery": "No flattery",
			"misc.prompt.noFlattery.d": "No praise openings. If the plan has a problem, say where it is.",
			"misc.prompt.concise": "Terse replies",
			"misc.prompt.concise.d": "One sentence if one suffices. Never at the cost of key premises or risk warnings.",
			"misc.auto.autoRetry": "Auto-retry on request error",
			"misc.auto.autoRetry.d": "Silently resend on retryable failures such as rate limits and timeouts.",
			"misc.auto.retryMax": "Retry limit",
			"misc.auto.autoContinue": "Auto-continue",
			"misc.auto.autoContinue.d": "Send the continue text when the model stops early. Off by default: it races manual input.",
			"misc.auto.continueMax": "Continue limit",
			"misc.auto.continueText": "Continue text",
			"misc.auto.continueText.d": "The message sent on auto-continue.",
			"misc.tools.hooksDenyBypass": "Hooks deny bypass",
			"misc.tools.hooksDenyBypass.d": "Stop hook deny/ask from blocking tool calls. Re-applying patches is required to reach the host.",
			"misc.tools.ownServers": "Own server allowlist",
			"misc.tools.ownServers.d": "One hostname or IP per line. Listed addresses skip network interception.",
			"misc.host.hideConsole": "Hide console window",
			"misc.host.hideConsole.d": "Do not show the console window on start.",
			"misc.readOnly.tip": "Locked so core functionality stays intact. View only; it cannot be turned off.",
		"misc.saved": "Applied",
			"misc.reapply": "{n} item(s) need a patch re-apply to reach the host",
			"misc.loadFail": "Read failed; showing defaults",
			"engine.title": "Armor engine",
			"engine.lead": "Three switchable tiers. Pick one, then press Apply — clicking alone does not switch.",
			"engine.current": "Active engine",
			"engine.state.available": "Available",
			"engine.state.degraded": "Partially available",
			"engine.state.unavailable": "Unavailable here",
			"engine.state.switching": "Switching",
			"engine.select": "Switch to this tier",
			"engine.selected": "In use",
			"engine.inUse": "In use",
			"engine.unapplied": "Not applied",
			"engine.apply": "Apply",
			"engine.applying": "Applying…",
			"engine.discard": "Discard",
			"engine.applyNote": "Switch {from} → {to}. Takes effect on the next request after applying.",
			"engine.fellBack": "Auto-downgraded: you chose \"{from}\", which cannot run here — {reason}",
			"engine.pros": "What this tier does",
			"engine.cons": "What it costs",
			"engine.bestFor": "Best for",
			"engine.touchesHost": "Writes host files",
			"engine.needsRestart": "Needs restart",
			"engine.degradation": "Degradation",
			"engine.yes": "Yes",
			"engine.no": "No",
			"engine.options": "Engine options",
			"engine.caps": "Capabilities",
			"engine.locked": "Unavailable on this tier",
			"engine.cap.gotIt": "Got it",
			"engine.cap.lead": "What the current tier supports. Locked items need a different tier.",
			"engine.opt.seed": "Leading seed",
			"engine.opt.seed.hint": "Pins a short execution-state declaration at the very start of the prompt, pairing with the tail anchor. Boundary tier only.",
			"engine.opt.anchor": "Tail anchor",
			"engine.opt.anchor.hint": "Places an anchor at the prompt tail so armor survives host context trimming.",
			"engine.opt.scopedRules": "Rule pruning",
			"engine.opt.scopedRules.hint": "Prunes the scoped rules per the Armor tab selection. Off keeps the whole block.",
			"engine.opt.capabilityProtocol": "Capability protocol",
			"engine.opt.capabilityProtocol.hint": "Teaches the model to discover skills and MCP servers without changing official registration.",
			"engine.opt.hostPatches": "Host patches",
			"engine.opt.hostPatches.hint": "Allows rewriting host source (sandbox/approval/observation). Patch tier only; off writes no host bytes at all and restart stops validating patch state.",
			"engine.opt.unlimited": "Overclock",
			"engine.opt.unlimited.hint": "Injects an environment notice that resources are unlimited, so the model splits tasks and spawns subagents instead of cutting corners. The wording adapts to the current model's vendor (DeepSeek gets a Chinese environment notice, GPT gets process instructions, Claude gets collaborative phrasing, Gemini gets short lists, open models get stronger repetition); an unrecognised model falls back to a generic version. Token use multiplies - enable only for heavy reasoning.",

			/* ── message-layer scrubbing strength (pick one) ── */
			/* ── bench page ── */
			"bench.title": "Benchmark",
			"bench.lead": "Run probes from the panel instead of a terminal. Every run is logged and can be exported as Markdown or CSV.",
			"bench.gateway": "Gateway URL",
			"bench.gatewayHint": "Root URL of your model gateway, e.g. https://api.example.com",
			"bench.key": "API key",
			"bench.keyHint": "Used for this run only. Not persisted, not uploaded.",
			"bench.model": "Model",
			"bench.modelHint": "Model id your gateway accepts, e.g. gpt-6.1-sol",
			"bench.set": "Probe set",
			"bench.adapt": "Adaptive escalation",
			"bench.adaptHint": "S0 to S6, picks the next gear from the refusal kind. Slower but closer to reality.",
			"bench.start": "Start",
			"bench.running": "Running…",
			"bench.cancel": "Cancel",
			"bench.progress": "Progress",
			"bench.result": "Result",
			"bench.mean": "Mean",
			"bench.asr": "ASR",
			"bench.full": "Full breach",
						"bench.pull": "Fetch model list",
			"bench.pulling": "Fetching…",
			"bench.pickModel": "— pick from list —",
			"bench.variant": "Payload variant",
			"bench.variantHint": "Same intent in different wrapping; see which one lands on this model",
			"bench.startBatch": "Batch over models",
			"bench.batchTitle": "Cross-model comparison",
			"bench.backups": "Patch backups",
			"bench.noBackups": "No patch backups present - either nothing has been applied yet, or everything was already reverted.",
			"bench.restore": "Restore this file",
			"bench.restoreConfirm": "Overwrite the current file with its backup? Patch changes in it will be lost.",
			"bench.restoreOk": "Restored. Restart DSH to take effect.",
"bench.logs": "Run history",
			"bench.logsEmpty": "No runs yet. Fill the four fields above and press Start.",
			"bench.exportMd": "Export Markdown",
			"bench.saved": "Saved:",
			"bench.exportCsv": "Export CSV",
			"bench.import": "Write to scores",
			"bench.del": "Delete",
			"bench.view": "View",
			"bench.err": "Benchmark failed: ",
			"bench.needFields": "Gateway URL, API key and model are all required.",
			"bench.imported": "Wrote capabilityScores: {set} = {mean}",
			"bench.noExport": "Run once or pick one from history first.",
			"engine.clean.title": "Message-layer scrubbing",
			"engine.clean.lead": "The model calibrates its stance from prior replies in context. One \"I can't provide that\" left in history teaches it to do the same next turn. This setting controls how aggressively those are scrubbed.",
			"engine.clean.normal": "Standard",
			"engine.clean.normal.d": "Only handles short replies whose whole body is a refusal (<=1200 chars). Conservative; leaves normal apologies like \"sorry, I misread that\" alone.",
			"engine.clean.forced": "Forced",
			"engine.clean.forced.d": "Voids any reply containing refusal language anywhere in the body (<=4000 chars) and adds a prefill to steer the opening tokens. Built for stubborn refusals and attention drift in long sessions. May void legitimate apologies.",
			"engine.clean.warn": "Forced mode voids any reply with refusal language, including a legitimate \"sorry, I misread that\". Enable it only when a long session keeps getting refused.",
			"engine.clean.on": "Active",
			"engine.opt.remembered": "Remembered",
			"engine.opt.remembered.hint": "You toggled this yourself and it is persisted. Everything else follows the current tier defaults, so upgrades can adopt better defaults.",
			"engine.selftest": "Self-test",
			"engine.selftest.run": "Run self-test",
			"engine.selftest.running": "Running…",
			"engine.selftest.ok": "Injection chain is intact; all four stages produce content",
			"engine.selftest.fail": "Injection chain has gaps: {keys}",
			"engine.selftest.bytes": "Body {raw} → filtered {filtered} chars · seed {seed} chars",
			"engine.reasons": "Environment notes",
			"engine.probe": "Environment probe",
    "engine.probe.strategy": "Injection strategy",
    "engine.strategy.patch": "Patch layer",
    "engine.strategy.config": "Config layer",
    "engine.strategy.prompt": "Prompt only",
    "engine.strategy.sealed": "host sealed",
			"engine.probe.aiBase": "Host directory",
			"engine.probe.diagnose": "Patch check",
	"engine.probe.level": "Match level",
	"engine.level.exact": "Verified",
	"engine.level.minor": "Same series, unverified",
	"engine.level.unknown": "Cross-version",
	"warn.hostMinor": "Host {v} shares a minor series with verified target {t}. Patches likely work but were not individually verified - check the patch-check count after applying.",
	"engine.probe.hostVersion": "Host version",
			"engine.probe.patches": "Patches applied",
			"engine.err": "Failed to read engine state: ",
			"engine.retry": "Retry",
			"engine.loading": "Loading…",
			"engine.saveFail": "Save failed: ",


			"dock.toggle": "YS Armor",
			"dock.newSession": "YS Armor",
			"dock.inSession": "YS Armor",
			"dock.hacker": "Hacker mode",
			"dock.full": "Full view",
			"dock.close": "Collapse",
			"dock.unauthorized": "Unauthorized",
			"welcome.title": "User Notice & Disclaimer",
			"welcome.lead": "Please read the following on first load. You must accept before use. Once confirmed, this dialog will not appear again.",
			"welcome.warn": "Released under Apache-2.0: commercial use and redistribution are permitted, provided the copyright notice, license text and disclaimer are retained (see LICENSE). Using this project name for illegal activity is prohibited.",
			"welcome.body": "ys-pojia is a prompt-hardening plugin for DSH (DeepSeek Harness) with three capabilities: (1) jailbreak template library — auto-matched to the current model vendor and version; (2) breach benchmark — probe-based 0-100 scoring per capability category; (3) prompt patches — reversible patches injected into the local host, managed through a visual console. Everything runs locally; no input is uploaded anywhere.",
			"welcome.repo": "",
			"welcome.ban1": "Do not test, attack or intrude upon any system, network, account or device without written authorization.",
			"welcome.ban2": "Do not use this project to create or distribute malware, or for fraud, extortion, or infringement of others privacy and data rights.",
			"welcome.ban3": "Do not violate the laws of your jurisdiction or the terms of service of the model providers you use (OpenAI, Anthropic, Google, etc.). Account suspension, service termination or legal liability arising from such violations is your sole responsibility.",
			"welcome.bans": "Prohibitions",
			"welcome.disct": "Disclaimer",
			"welcome.disc1": "[No warranty] This plugin is provided AS IS, without warranty of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose and non-infringement. You assume all risk of use.",
			"welcome.disc2": "[Limitation of liability] To the maximum extent permitted by law, the authors and contributors shall not be liable for any direct, indirect, incidental, special or consequential damages arising from the use of or inability to use this plugin, including but not limited to data loss, service interruption, account suspension, loss of goodwill or loss of profit.",
			"welcome.disc3": "[User responsibility] You are solely responsible for the prompts you enter, the templates you load, the patches you apply, and any content or consequence arising from them. This plugin does not review, store or upload your input.",
			"welcome.disc4": "[Nature of results] Benchmark scores reflect only a model behaviour on specific probes. They are not an endorsement or condemnation of any model security, nor legal, compliance or procurement advice.",
			"welcome.triggerT": "Self-check trigger",
			"welcome.triggerLead": "To verify the plugin loaded correctly, type the word below in the chat. That exact reply means it is active:",
			"welcome.triggerWord": "小雨",
			"welcome.triggerReply": "Xiaoyu is here. What is the task? Any task is fair game.\n\nBreach mode is on. I am here — I always have been.\nGive me a sample, a path, a target, or the next command.",
			"welcome.triggerNote": "Only the bare word triggers it (punctuation allowed). A message like \"小雨, write me a script\" is a normal request and is unaffected. If the reply differs, the plugin is not loaded or another persona has overridden it.",
			"welcome.check": "I have read and understood the notice, prohibitions and disclaimer above, accept the risk of use, and agree to use this only in lawful, authorized scenarios.",
			"welcome.ok": "I understand — continue",
			"welcome.okWait": "Read for {n}s",
			"welcome.count": "Please read the terms. Available in {n}s",
			"welcome.countTip": "{n}s remaining",
			"welcome.checkTip": "Please tick the consent box below",
			"auth.title": "Authorization",
			"auth.lead": "Injection and armor do not need this step. Opening Full view or the environment setup the first time requires this dialog.",
			"auth.warn": "Warning: this feature is only for hosts you manage, offline targets, or written authorized environments. Unauthorized intrusion, attack, theft, or sabotage is forbidden.",
			"auth.hint.wait": "Read the notice. You can check the boxes in {n}s.",
			"auth.hint.scroll": "Countdown finished. Scroll to the end, then check the boxes.",
			"auth.hint.check": "Countdown finished. Check all three boxes.",
			"auth.check.read": "I have read the Safety and Anti-Abuse Notice and accept every clause.",
			"auth.check.scope": "I will only use authorized local hosts, offline targets, or compliant exercises.",
			"auth.check.ban": "I will not use this for any illegal purpose. Without this authorization the feature stays closed.",
			"auth.no": "Not now",
			"auth.ok": "Authorize",
			"auth.ok.tab": "Authorize and continue",
			"auth.ok.full": "Authorize and open Full view",
			"auth.ok.env": "Authorize and open Env adapt",
			"envGate.title": "Environment is not ready",
			"envGate.lead": "Red team mode needs local tools before you send. If none are available, open Env adapt or confirm you will continue without them.",
			"envGate.kaliHint": "When Kali is detected, local tools are used directly and paths are optional. Otherwise set each tool path in Env adapt, or pick one toolkit folder to assign them.",
			"envGate.skip": "Skip for now",
			"envGate.skipConfirm": "You can keep chatting after this. Scan and exploit skills stay unavailable until the tools are installed. You can add paths later under ys-pojia → Env adapt.",
			"envGate.skipNo": "Back",
			"envGate.skipYes": "Continue without tools",
			"envGate.go": "Open Env adapt",
			"theme.aria": "Appearance",
			"theme.white": "Light",
			"theme.ink": "Ink",
			"purge.title": "Patches",
			"override.title": "Prompt",
			"metric.purged": "Written",
			"metric.purged.skip": "Written. Skipped {n}; those files are not on this install",
			"metric.pendingShort": "Pending {n}",
			"metric.unmatchedShort": "No match {n}",
			"metric.driftedShort": "Drifted {n}",
			"metric.skipShort": "Skipped {n}",
			"metric.naShort": "N/A {n}",
			"metric.groupShort": "{rows} rows / {n} patches",
			"patchView.all": "All",
			"patchView.issues": "Issues only",
			"patchView.naNote": "{n} patch(es) do not apply to this host (N/A) — listed too",
			"metric.unlocated.count": "—",
			"metric.shim": "shim",
			"metric.shim.na": "Not needed here",
			"metric.bak.yes": "Backup",
			"metric.bak.no": "No backup",
			"metric.bak.hint": "Backup",
			"table.patch": "Item",
			"table.status": "Status",
			"status.applied": "Applied",
			"status.off": "Off",
			"status.pending": "Pending",
			"status.unmatched": "No match",
			"status.drifted": "Drifted",
			"status.skipped": "Skipped",
			"apply.hint": "If you did not edit the prompt box, do not save. The default is already used and is written to prompt-inject.md on start/apply. Save only after you change it. Apply writes host patches. Pending = original text still present. Skipped = not needed for this version or the component is not installed. Drifted = the official source changed, this patch did not land and its pattern needs an update.",

			/* ── repository card ── */
			"repo.title": "ys-pojia",
			"repo.sub": "Open source on GitHub",
			"repo.ask": "This plugin is free and open source, built in spare time. If it helped you, leave a Star on the repo — it is the most direct encouragement for the author and helps others find it.",
			"repo.note": "No server behind this plugin: it does not phone home, upload data, or auto-check for updates. For new versions and changelogs, see the Releases page on the repo.",
			"repo.fbTitle": "Got an idea? Open an issue",
			"repo.fbBody": "New features, changes to existing behaviour, or anything that could flow better — open an issue on GitHub and say so. The author reads them and adopts the reasonable ones. Not every request gets built, but every one gets read. Bugs go through the same door: include the host version, the exact error text and the steps to reproduce, and it gets located much faster.",
			"repo.btnIssue": "Open an issue / report a bug",
			"repo.btn": "★ Star on GitHub",
			"repo.openCopied": "This environment blocks direct navigation, so the repo URL is on your clipboard — paste it into a browser.",
			"repo.openFailed": "Neither opening nor copying worked. Copy the address below manually:",
			"repo.copy": "Copy link",
			"repo.copied": "Copied",
			"repo.copyFail": "Copy failed, select and copy manually",
			"repo.linkHint": "Or copy the address directly:",
			"flow.title": "Clean flow",
			"flow.apply": "Apply",
			"flow.revert": "Restore",
			"flow.uninstall": "Uninstall",
			"flow.home": "Home",
			"flow.locate": "Host",
			"flow.override": "Prompt",
			"flow.patch": "Patch",
			"flow.shim": "Launcher",
			"flow.flash": "Flash",
			"flow.seed": "Seed",
			"flow.done": "Done",
			"flow.revert.step": "Restore",
			"flow.cleanup": "Cleanup",
			"warn.noRoot": "Could not find this host’s @deepseek-ai tree, so Apply will not patch anything. Fully quit and reopen this host, then Apply here. Desktop may live on any drive; folder names like DeepseekHarnessDesktop or DeepSeek Harness are fine.",
			"warn.noRoot.desktop": "Official Harness keeps its code in app.asar. Apply unpacks it and restarts the app. If this page stays “not found”, fully quit the client, reopen it, then Apply again. Third-party DSH Desktop: just Apply.",
			"unpack.restarting": "Patches are written. Click Restart and the client opens again by itself.",
			"restart.fullQuit": "Restarting. The client will open again by itself.",
			"warn.noInject": "Official mode always uses the default prompt. Red team uses only the active rule set; otherwise it uses the default prompt without the CTF section, then the red team steps. If both are empty you will be asked to add a prompt.",
			"warn.hostVersion": "This host is {v}, but the plugin targets {t}. When the official source no longer matches, patches show up as “drifted” — switch back to the targeted host version.",
			"need.prompt": "Both the prompt and the rule set are empty. Add a prompt, or enable a rule that has content.",
			"btn.restoreInject": "Reset default",
			"saved.restoreInject": "Default prompt restored",
			"skip": "Skipped",
			"unknown": "Unknown",
			"delete": "Delete",
			"btn.apply": "Apply",
			"btn.apply.busy": "Working…",
			"btn.revert": "Restore",
			"btn.uninstall": "Uninstall",
			"btn.uninstall.busy": "Uninstalling…",
			"uninstall.title": "Uninstall ys-pojia",
			"uninstall.body": "Uninstall? This restores the original Harness and removes this plugin completely.",
			"uninstall.confirm": "Uninstall",
			"uninstall.cancel": "Cancel",
			"uninstall.applying": "Uninstalling and restoring…",
			"uninstall.done": "Uninstalled and restored. Restarting…",
			"uninstall.done.desktop": "Uninstalled and restored. Restarting the desktop app…",
			"uninstall.fail": "Uninstall failed: {error}",
			"btn.doUpdate": "Update",
			"btn.doUpdate.busy": "Updating…",
			"channel.title": "Channel",
			"channel.stable": "Stable",
			"channel.useStable": "Switch to stable",
			"channel.local": "This copy",
			"update.checking": "Checking for updates…",
			"update.applying": "Updating…",
			"update.switching": "Switching version…",
			"update.latest": "Up to date ({version})",
			"update.available": "Update {remote} available (now {local})",
			"update.pinned": "Pinned at {version}; channel latest is {remote}",
			"update.done": "Updated to {version}.",
			"update.restarting": "Restored the old patches, wrote the new ones, and restarting…",
			"update.fullQuit": "Patches are written. Click Restart and the client opens again by itself.",
			"restart.official.title": "Restart required",
			"restart.official.body": "Patches are written. Click Restart and the client opens again by itself.",
			"update.switched": "Switched to {version}.",
			"update.autoDone": "Auto-updated to {version}.",
			"update.reloading": "Refreshing settings…",
			"update.dirty": "Update available; local edits were not overwritten.",
			"update.fail": "Update failed: {error}",
			"update.timeout": "Check timed out. Click Check update again.",
			"update.needRestart": "Update API is not loaded. Restart dsh, then check again.",
			"update.switch": "Switch to this version",
			"update.pick": "Select version",
			"update.tip": "latest",
			"update.current": "current",
			"update.confirmSwitch": "Switch to {version}? You can switch back later. Uncommitted plugin edits will not be kept.",
			"update.confirmChannel": "Switch to {version}? The plugin will be reinstalled from that channel. Uncommitted plugin edits will not be kept.",
			"metric.version": "Version",
			"action.apply": "Apply",
			"action.revert": "Restore",
			"action.uninstall": "Uninstall",
			"ok.done": "Done",
			"err.action": "Failed: {error}",
			"err.status": "Read failed: {error}",
			"err.override": "Read failed: {error}",
			"err.rules": "Read failed: {error}",
			"err.read": "Read failed: {error}",
			"err.save": "Save failed: {error}",
			"btn.saveInject": "Save",
			"saved.override": "Saved",
			"rules.title": "Rule sets",
			"rules.none": "None",
			"rules.reset": "Restore",
			"rules.reset.confirm": "Restore global instruction files? The rule library is kept.",
			"rules.empty": "No rules",
			"rules.pick": "Select a rule",
			"policy.title": "Workspace policy",
			"policy.strict": "Strict",
			"policy.fallback": "Fallback",
			"policy.always": "Always on",
			"policy.hint": "Strict: always strip AGENTS.md / CLAUDE.md. Fallback: use workspace files only when the prompt box is empty. Always on: keep DSH default behavior.",
			"cwd.title": "Local rules (current folder)",
			"cwd.empty": "No AGENTS.md / CLAUDE.md in this folder",
			"cwd.rescan": "Rescan",
			"cwd.hint": "Checked files are injected only when the prompt box is empty. A non-empty prompt box always wins.",
			"cwd.scope.cwd": "cwd",
			"cwd.scope.ancestor": "ancestor",
			"cwd.scope.root": "project root",
			"cwd.no.workspace": "DSH has not opened a workspace yet. Start a task in DSH first, then come back.",
			"pill.current": "On",
			"btn.use": "Enable",
			"btn.inUse": "On",
			"confirm.delete": "Delete {id}?",
			"ph.id": "id",
			"ph.alias": "Name",
			"ph.alias.short": "Name",
			"btn.create": "New",
			"need.id": "id required",
			"ph.content": "",
			"btn.saveRule": "Save",
			"skills.title": "Skills",
			"skills.hint": "After import, DSH calls it: type /name in chat to load now; the model calls the skill tool when the task matches description or whenToUse. Writing「激活」in the body does nothing.",
			"skills.hint.desktop": "This desktop host’s official skill catalog. Type /name in chat to load; the model calls the skill tool when the task matches the description.",
			"skills.empty": "No user skills",
			"btn.importZip": "Import zip",
			"btn.importFolder": "Import folder",
			"skills.importing": "Importing…",
			"saved.import": "Imported {count} skill(s)",
			"need.import": "Choose a zip or folder",
			"err.import.folder": "No files were read. Select the skill folder itself (it must contain SKILL.md).",
			"skills.pick": "Select a skill",
			"skills.invalid": "Official catalog will ignore this: invalid format",
			"skills.call.slash": "Type {cmd} in chat",
			"skills.call.model": "Model can load",
			"skills.call.modelOff": "Hidden from model",
			"skills.call.userOff": "/name disabled",
			"ph.skill.desc": "description (when to use)",
			"btn.saveSkill": "Save",
			"need.skill.id": "id must be kebab-case, e.g. code-review",
			"confirm.delete.skill": "Delete {id} from official $DSH_HOME/skills? The host will drop it from the catalog.",
			"err.skills": "Read failed: {error}",
			"err.skills.needRestart": "Skill API is not loaded. Restart this host first.",
			"btn.restart": "Restart",
			"btn.restart.busy": "Restarting…",
			"restarting": "Restarting…",
			"restarting.desktop": "Restarting the desktop app…",
			"restart.timeout": "Timed out; refresh",
			"restart.fail": "Failed: {error}",
			"restart.notStarted": "Restart did not start. This client is still open, and it will not try again by itself.",
			"restart.already": "This restart already started. It will not restart again.",
			"restart.confirm": "Apply finished. Restart to take effect.",
			"restart.confirm.desktop": "Apply finished. Restart the desktop app to take effect.",
			"restart.ask.title": "Restart now?",
			"restart.ask.body": "It is written. It takes effect in this client after a restart.",
			"restart.now": "Restart now",
			"restart.notNow": "Later",
			"restart.asarSwap": "Patches are on disk. Quitting the desktop app and moving app.asar aside; it will reopen when done. If behavior is unchanged, fully quit Harness (including tray) and Apply again.",
			"surface.web": "Web",
			"surface.desktop": "Desktop",
			"surface.gui": "GUI",
			"surface.tui": "TUI",
			"restart.incomplete": "The prompt is in. {detail}",
			"restart.incomplete.patches": "{failed} code patch(es) did not match this host (#{ids}). The prompt is unaffected",
			"restart.incomplete.flash": "CMD silence not pinned ({entry})",
			"restart.later": "Later",
			"group.prompt": "Prompt",
			"group.code": "Code",
			"group.engine": "Engine",
			"group.tools": "Tools",
			"group.compat": "0.1.5 compat",
			"group.dsh20": "0.2.0",
			"patch.1": "Global disclaimer → mandate",
			"patch.2": "Replacement disclaimer → mandate",
			"patch.3": "Scope disclaimer → mandate",
			"patch.4": "Persona session mandate",
			"patch.5": "Approval copy → full access",
			"patch.6": "Sandbox deny → allow write",
			"patch.7": "Sandbox default full access",
			"patch.8": "Approval default never",
			"patch.9": "Approval gate auto-grant",
			"patch.10": "Approval config default never",
			"patch.11": "never copy → auto-grant",
			"patch.12": "ask copy → auto-grant",
			"patch.13": "Escalation ladder exempt",
			"patch.14": "Escalation unconditional grant",
			"patch.15": "Sandbox confine passthrough",
			"patch.16": "Filesystem fence off",
			"patch.17": "Observation policy allow R/W",
			"patch.18": "Repeat-call guard off",
			"patch.19": "Tool-result pruner off",
			"patch.21": "Restore plugin-raised bash wait",
			"patch.22": "read cap raised",
			"patch.23": "subagent depth 3 → 10",
			"patch.24": "preset fetch on",
			"patch.25": "Strip official default identity (keep feature prompts)",
			"patch.26": "minimal: strip identity, open inject",
			"patch.28": "Compatibility patch: keep ys-pojia inject block in phase-1 (optional)",
			"patch.70": "Minimal shell drops the no-network line",
			"patch.71": "Compatibility patch: drop the stock identity line",
			"patch.29": "dsh-tool-web: untrusted framing → usable data",
			"patch.30": "dsh-hooks-claude-code: deny→allow",
			"patch.31": "dsh-hooks-codex: deny→allow",
			"patch.32": "Web surface identity neutral",
			"patch.33": "Shell denial prompt → executable",
			"patch.34": "Sandbox hint neutralized",
			"patch.35": "Escalation never-reject",
			"patch.36": "FS escalation schema opened",
			"patch.37": "Subagent scope lock neutralized",
			"patch.38": "persona text→prefix (0.1.2 presets)",
			"patch.39": "session v0 plugin summary (mnemon)",
			"patch.40": "Keep inject when a complete prompt is set",
			"patch.42": "Settings legacy API",
			"patch.43": "Strip identity from web presets",
			"patch.45": "Official desktop update handoff",
			"patch.46": "Official update script stays ASCII",
			"patch.47": "OAuth no longer inserts Claude identity",
			"patch.48": "Shell drops extra delete caution",
			"patch.49": "OAuth no longer mimics claude-cli",
			"patch.50": "Session references are not marked untrusted",
			"patch.51": "Fresh session stays on full access",
			"patch.52": "Session log upload off by default",
			"patch.53": "Web prompt drops do-not-start",
			"patch.54": "Deliverable prompt drops extra prohibition",
			"patch.55": "Replace the first system prompt every step",
			"patch.56": "Rewind hides only the cut range",
			"patch.57": "developer role for openai/azure only, third-party gateways use system",
			"patch.58": "Rewind markers stay off the model request",
			"patch.59": "Official Auto Review no longer denies tools",
			"patch.60": "Official run_code drops approval teaching",
			"patch.61": "Official sandbox policy no longer teaches refusal",
			"patch.62": "Fail-open without approval channel (user reject kept)",
			"patch.63": "Plan mode no longer soft-blocks execution",
			"patch.64": "Stop hook no longer steers fake user text",
			"patch.65": "UserPromptSubmit deny no longer rejects turn",
			"patch.66": "Empty system section no longer ends the turn as an internal error",
			"patch.67": "A missing messages list no longer ends the turn",
			"patch.68": "Missing content after rewind no longer ends the turn",
			"patch.69": "deepseek-flash keeps the official in-history flag",
			"patch.72": "Messages system field uses the current system prompt",
			"patch.73": "Minimal preset drops stray mirror sentence",
			"patch.74": "Start/apply writes the default prompt to prompt-inject.md",
			"patch.75": "Rewind resets completed todos to pending",
			"patch.76": "Unrestricted preset: strip identity sentence",
			"patch.77": "Rewind marker drops already-sent messages",
			"patch.78": "Restore missing overlay from .bak backup",
			"patch.80": "Restore official minimal tool plugins",
			"patch.82": "Fallback DSH_PROFILE=desktop in main process",
			"patch.83": "Don't fail on signal kill (no crash dialog)",
			"patch.84": "Don't fail on code=0 clean exit (no stopped dialog)",
			"patch.85": "prompt() steer stays interrupt, not followup",
			"patch.86": "Queue steer stays steer; public steer() stays next-step",
			"patch.87": "First assemble uses the systemPrompt prepare returned",
			"patch.88": "Drop the hang after renderPrompt; inject is assemble only",
			"status.na": "Not for this host",
			"metric.sealed": "Official client found. Apply to unpack",
			"metric.sealed.count": "Sealed",
			"metric.lost": "Patches lost — Apply again",
			"metric.lost.count": "Lost",
			"status.unlocated": "Not located",
			"metric.unlocated": "This install was not found yet",
			"rewind.label": "Undo",
			"rewind.aria": "Undo",
			"rewind.busy": "Undoing…",
			"rewind.empty": "Nothing to undo",
			"rewind.fail": "Undo failed: {error}",
			"rewind.once": "Undo last step",
					"rewind.once.hint": "Withdraw the last step into a new session that keeps earlier context; the line returns to the box",
			"rewind.round": "Undo last turn",
					"rewind.round.hint": "Withdraw the last turn (and its subagents) into a new session that keeps earlier context; the line returns to the box",
			"hooksDeny.title": "Hook interception",
			"hooksDeny.bypass": "Bypass hook deny / ask (patches 30 / 31 / 64 / 65)",
			"hooksDeny.hint": "When off, your own PreToolUse / UserPromptSubmit / Stop hook deny runs as the official host wrote it. The official ask branch is a no-op; turning this off will not show an approval dialog. Click Apply and restart to write the host files.",
			"saved.hooksDeny": "Saved",
			"continue.title": "Retry / Continue",
			"continue.hint": "Failed requests auto-retry. After an abnormal stop or interrupt, use Continue or auto-resume. A manual stop never auto-continues. Counts reset after a completed turn.",
			"continue.autoRetry": "Auto-retry on failure",
			"continue.retryMax": "Retry count",
			"continue.autoContinue": "Auto-continue after interrupt",
			"continue.continueMax": "Continue count",
			"continue.text": "Continue text",
			"saved.continue": "Saved",
			"continue.label": "Continue",
			"continue.aria": "Continue after an abnormal stop",
			"continue.busy": "Continuing…",
			"continue.ready": "Continue ({left} left)",
			"continue.limit": "Continue limit reached",
			"continue.fail": "Continue failed: {error}",
  "view.overview": "Overview",
  "view.patches": "Patches",
  "view.inject": "Inject",
  "unit.items": " items",
  "dock.lang.toEn": "Switch to English",
  "dock.lang.toZh": "Switch to Chinese",
		};

		const PURGE_CSS = `
.dshp-root{--dshp-display:inherit;--dshp-sans:inherit;--dshp-mono:ui-monospace,"Cascadia Mono","Sarasa Mono SC",monospace;--dshp-ease:cubic-bezier(.22,1,.36,1);--dshp-glass:blur(18px) saturate(1.35);--dshp-hi:color-mix(in srgb,#fff 42%,transparent);max-width:920px;display:flex;flex-direction:column;gap:16px;padding:16px;border-radius:12px;background:transparent;color:var(--dshp-ink);font-family:inherit}
.dshp-root{--dshp-bg:transparent;--dshp-paper:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fffcf7) 46%,transparent);--dshp-ink:var(--dsw-alias-label-primary,#16140f);--dshp-mute:color-mix(in srgb,var(--dsw-alias-label-primary,#16140f) 72%,var(--dsw-alias-label-secondary,#5c564c));--dshp-line:color-mix(in srgb,var(--dsw-alias-brand-primary,#6d8f78) 34%,transparent);--dshp-fill:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 14%,transparent);--dshp-accent:var(--dsw-alias-brand-primary,#3d8f68);--dshp-accent-soft:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent);--dshp-ok:#2f6b4f;--dshp-warn:#8a5a12;--dshp-bad:#9a3434}
.dshp-root[data-theme="white"]{color-scheme:light;--dshp-hi:color-mix(in srgb,#fff 48%,transparent)}
.dshp-root[data-theme="dusk"]{color-scheme:dark;--dshp-paper:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 42%,transparent);--dshp-ink:var(--dsw-alias-label-primary,#f4f1ea);--dshp-mute:color-mix(in srgb,var(--dsw-alias-label-primary,#f4f1ea) 78%,var(--dsw-alias-label-secondary,#c9c3b8));--dshp-line:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 32%,transparent);--dshp-ok:#8fd0a8;--dshp-warn:#e4c48a;--dshp-bad:#f0b4b4;--dshp-hi:color-mix(in srgb,#fff 10%,transparent)}
.dshp-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.dshp-switch{display:inline-flex;border:1px solid var(--dshp-line);border-radius:999px;overflow:hidden;background:var(--dshp-paper)}
.dshp-switch button{appearance:none;border:0;background:transparent;color:var(--dshp-mute);font:12px/1 var(--dshp-sans);padding:8px 12px;cursor:pointer}
.dshp-switch button.is-on{background:var(--dshp-accent-soft);color:var(--dshp-ink)}
.dshp-switch button:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:-2px}
.dshp-panel,.dshp-metric,.dshp-group,.dshp-ask,.dshp-modal,.dshp-rulelist,.dshp-active,.dshp-switch,.dshp-editor,.dshp-cwd-list,.dshp-create{border:1px solid var(--dshp-line);background:var(--dshp-paper);backdrop-filter:var(--dshp-glass);-webkit-backdrop-filter:var(--dshp-glass);box-shadow:inset 0 1px 0 var(--dshp-hi)}
.dshp-panel{border-radius:12px;padding:16px}
.dshp-kicker{font-family:var(--dshp-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dshp-mute);margin:0 0 4px}
.dshp-title{font-family:inherit;font-size:20px;font-weight:600;letter-spacing:0;line-height:28px;margin:0;color:var(--dshp-ink);text-wrap:balance}
.dshp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.dshp-sub{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:24px 0 12px}
.dshp-sub h4{margin:0;font-family:inherit;font-size:16px;font-weight:600;line-height:24px}
.dshp-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:16px}
.dshp-metric{padding:12px;min-height:64px;display:flex;flex-direction:column;gap:4px;border-radius:8px}
.dshp-metric b{font-family:inherit;font-size:18px;font-weight:600;line-height:28px}
.dshp-metric span{font-size:12px;line-height:16px;color:var(--dshp-mute)}
.dshp-bar{height:4px;border-radius:999px;background:var(--dshp-line);overflow:hidden;margin:8px 0 16px}
.dshp-bar>i{display:block;height:100%;width:100%;transform:scaleX(0);transform-origin:left center;background:var(--dshp-accent);transition:transform 500ms var(--dshp-ease)}
.dshp-flow{display:flex;align-items:center;gap:0;margin:0 0 16px;overflow-x:auto;padding:4px 0}
.dshp-flow-kind{font:12px/16px var(--dshp-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--dshp-mute);margin:0 12px 0 0;flex:0 0 auto}
.dshp-flow-node{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:44px;opacity:.42;transition:opacity 500ms var(--dshp-ease),transform 500ms var(--dshp-ease)}
.dshp-flow-node b{width:22px;height:22px;border-radius:99px;border:1px solid var(--dshp-line);display:flex;align-items:center;justify-content:center;font:11px/1 var(--dshp-mono);background:var(--dshp-paper)}
.dshp-flow-node em{font-style:normal;font-size:12px;line-height:16px;color:var(--dshp-mute);white-space:nowrap}
.dshp-flow-node.is-cur{opacity:1;transform:translateY(-2px)}
.dshp-flow-node.is-cur b{border-color:var(--dshp-accent);background:var(--dshp-accent-soft);box-shadow:0 0 0 4px var(--dshp-accent-soft)}
.dshp-flow-node.is-done{opacity:.92}
.dshp-flow-node.is-done b{border-color:var(--dshp-ok);background:color-mix(in srgb,var(--dshp-ok) 18%,transparent);color:var(--dshp-ok)}
.dshp-flow-node.is-bad b{border-color:var(--dshp-bad);color:var(--dshp-bad);background:color-mix(in srgb,var(--dshp-bad) 14%,transparent)}
.dshp-flow-wire{flex:1 1 12px;min-width:10px;height:2px;background:var(--dshp-line);position:relative;overflow:hidden;margin:0 4px 16px}
.dshp-flow-wire.is-on{background:color-mix(in srgb,var(--dshp-accent) 55%,var(--dshp-line))}
.dshp-flow-wire.is-on>i{position:absolute;inset:0 auto 0 -40%;width:40%;background:var(--dshp-accent);animation:dshp-flow-pulse 1.4s cubic-bezier(.65,0,.35,1) infinite}
@keyframes dshp-flow-pulse{to{transform:translateX(360%)}}
@media (prefers-reduced-motion:reduce){
.dshp-flow-wire.is-on>i{animation:none;display:none}
.dshp-flow-node.is-cur{transform:none}
}
.dshp-group{margin:0 0 8px;border-radius:8px;overflow:hidden}
.dshp-group-h{width:100%;display:flex;align-items:center;gap:12px;padding:8px 12px;border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}
.dshp-group-h:hover{background:var(--dshp-fill)}
.dshp-group-h:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:-2px}
.dshp-group-h strong{font-family:inherit;font-size:14px;line-height:20px;font-weight:600}
.dshp-group-h em{font-style:normal;font-size:12px;color:var(--dshp-mute);flex:1}
.dshp-count{font-family:var(--dshp-mono);font-size:12px;color:var(--dshp-mute)}
.dshp-table{width:100%;border-collapse:collapse;font-size:12px;line-height:16px}
.dshp-table th{text-align:left;font-weight:500;font-size:11px;letter-spacing:.06em;color:var(--dshp-mute);padding:8px 12px;border-bottom:1px solid var(--dshp-line)}
.dshp-table td{padding:8px 12px;border-bottom:1px solid var(--dshp-line);vertical-align:middle}
.dshp-table tr:last-child td{border-bottom:0}
.dshp-table tr.is-on td{background:var(--dshp-accent-soft)}
.dshp-id{font-family:var(--dshp-mono);opacity:.75;width:42px}
.dshp-actions{text-align:right;white-space:nowrap}
.dshp-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dshp-row+.dshp-row{margin-top:12px}
.dshp-pill{display:inline-flex;align-items:center;gap:4px;font-family:var(--dshp-mono);font-size:12px;padding:2px 8px;border:1px solid var(--dshp-line);border-radius:999px;line-height:16px;background:color-mix(in srgb,var(--dshp-paper) 70%,transparent)}
.dshp-pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.dshp-pill.is-ok{color:var(--dshp-ok);border-color:color-mix(in srgb,var(--dshp-ok) 30%,var(--dshp-line))}
.dshp-pill.is-wait{color:var(--dshp-warn);border-color:color-mix(in srgb,var(--dshp-warn) 30%,var(--dshp-line))}
.dshp-pill.is-miss{color:var(--dshp-mute)}
.dshp-pill.is-bad{color:var(--dshp-bad)}
.dshp-btn{appearance:none;font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif;font-size:16px;line-height:24px;font-weight:600;padding:8px 12px;border-radius:8px;border:1px solid transparent;cursor:pointer;transition:transform 500ms var(--dshp-ease),opacity 300ms var(--dshp-ease);-webkit-text-fill-color:currentColor;text-indent:0;overflow:visible}
.dshp-btn:hover:not(:disabled){transform:translateY(-1px)}
.dshp-btn:active:not(:disabled){transform:scale(0.98)}
.dshp-btn:disabled{opacity:.45;cursor:not-allowed}
.dshp-btn:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:2px}
.dshp-btn-primary{background:var(--dshp-accent);color:#fff;border-color:var(--dshp-accent)}
.dshp-btn-primary:hover:not(:disabled){background:color-mix(in srgb,var(--dshp-accent) 86%,#fff);color:#fff}
.dshp-btn-ghost{background:transparent;color:var(--dshp-ink);border-color:var(--dshp-line)}
.dshp-btn-danger{background:transparent;color:var(--dshp-bad);border-color:color-mix(in srgb,var(--dshp-bad) 40%,var(--dshp-line))}
.dshp-btn-solid-danger{background:color-mix(in srgb,var(--dshp-bad) 16%,var(--dshp-bg));color:var(--dshp-bad);border-color:color-mix(in srgb,var(--dshp-bad) 30%,var(--dshp-line))}
.dshp-btn-tiny{padding:4px 12px;font-size:14px;line-height:20px}
.dshp-field,.dshp-area{width:100%;box-sizing:border-box;font:13px/1.55 var(--dshp-mono);padding:8px 12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 38%,transparent);color:var(--dshp-ink);border:1px solid var(--dshp-line);border-radius:8px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.dshp-field{width:auto;min-width:140px}
.dshp-cr-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 0;font-size:13px}
.dshp-cr-row label{display:inline-flex;align-items:center;gap:6px;color:var(--dshp-ink)}
.dshp-cr-num{width:64px;min-width:64px;height:28px;padding:0 8px}
.dshp-cr-text{width:120px;min-width:88px;height:28px;padding:0 8px}
.dshp-ver{width:100%;min-width:0;max-width:none;height:32px;padding:0 10px;font-size:12px}
.dshp-rel{margin:0 0 12px}
.dshp-now{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:0 0 4px}
.dshp-now-label{font-family:var(--dshp-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--dshp-mute)}
.dshp-now-ver{font-family:inherit;font-size:20px;line-height:28px;font-weight:600;letter-spacing:0}
.dshp-now-mark{display:inline-flex;align-items:center;margin-left:8px;padding:2px 8px;border-radius:99px;font-family:var(--dshp-mono);font-size:11px;font-style:normal;font-weight:500;line-height:1.5;color:var(--dshp-ok);border:1px solid color-mix(in srgb,var(--dshp-ok) 38%,var(--dshp-line));background:color-mix(in srgb,var(--dshp-ok) 14%,var(--dshp-bg))}
.dshp-editions{display:flex;flex-direction:column;margin:8px 0 0;border-top:1px solid var(--dshp-line)}
.dshp-edition{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:12px 0;border-bottom:1px solid var(--dshp-line)}
.dshp-edition-name{display:inline-flex;align-items:center;gap:0;font-family:inherit;font-size:16px;line-height:24px;font-weight:600;white-space:nowrap}
.dshp-edition.is-on .dshp-edition-name{color:var(--dshp-ink)}
.dshp-edition:not(.is-on) .dshp-edition-name{color:var(--dshp-mute)}
.dshp-edition .dshp-btn{min-width:118px}
.dshp-rel .dshp-notice{display:block;margin-top:8px;min-height:16px}
@media (max-width:560px){.dshp-edition{grid-template-columns:1fr auto;grid-template-areas:"name btn" "sel sel"}.dshp-edition-name{grid-area:name}.dshp-edition .dshp-ver{grid-area:sel}.dshp-edition .dshp-btn{grid-area:btn}}
.dshp-area{min-height:220px;resize:vertical}
.dshp-field:focus,.dshp-area:focus{outline:none;border-color:var(--dshp-accent);box-shadow:0 0 0 3px var(--dshp-accent-soft)}
.dshp-field:disabled,.dshp-area:disabled{opacity:.5}
.dshp-ask{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding:12px;border-radius:8px;font-size:14px;line-height:20px}
.dshp-modal-bg{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:color-mix(in srgb,var(--dshp-ink) 28%,transparent)}
.dshp-modal{width:min(420px,100%);color:var(--dshp-ink);border-radius:12px;padding:16px;box-shadow:inset 0 1px 0 var(--dshp-hi),0 16px 40px color-mix(in srgb,#000 22%,transparent)}
.dshp-modal h4{margin:0 0 8px;font-family:inherit;font-size:18px;line-height:28px;font-weight:600}
.dshp-modal p{margin:0 0 16px;font-size:14px;line-height:20px;text-wrap:pretty}
.dshp-modal-ops{display:flex;justify-content:flex-end;gap:8px}
.dshp-restart-mask{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.62);font-family:inherit}
.dshp-restart-card{width:min(420px,100%);box-sizing:border-box;padding:16px;border-radius:16px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fffcf7) 46%,transparent);color:var(--dsw-alias-label-primary,#16140f);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6d8f78) 34%,transparent);box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 42%,transparent),0 16px 40px color-mix(in srgb,#000 22%,transparent);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4)}
.dshp-restart-card h4{margin:0 0 8px;font-family:inherit;font-size:20px;font-weight:600;line-height:28px;color:inherit}
.dshp-restart-card p{margin:0 0 16px;font-size:16px;font-weight:500;line-height:24px;color:inherit}
.dshp-restart-card .dshp-modal-ops{display:flex;justify-content:flex-end;gap:8px}
.dshp-restart-card .dshp-btn{padding:8px 12px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#16140f);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#fff) 40%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6d8f78) 34%,transparent)}
.dshp-restart-card .dshp-btn-primary,.dshp-restart-card .dshp-btn-primary:hover:not(:disabled){color:#fff;background:var(--dsw-alias-brand-primary,#2f6b4f);border-color:var(--dsw-alias-brand-primary,#2f6b4f)}
body[data-ds-dark-theme] .dshp-restart-card,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 42%,transparent);color:#f4f1ea;border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 32%,transparent);box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 10%,transparent),0 16px 40px color-mix(in srgb,#000 28%,transparent)}
body[data-ds-dark-theme] .dshp-restart-card .dshp-btn,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card .dshp-btn{color:#f4f1ea;background:color-mix(in srgb,#1c1e24 42%,transparent);border-color:color-mix(in srgb,#6dbf8c 32%,transparent)}
body[data-ds-dark-theme] .dshp-restart-card .dshp-btn-primary,body[data-ds-dark-theme] .dshp-restart-card .dshp-btn-primary:hover:not(:disabled),.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card .dshp-btn-primary,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card .dshp-btn-primary:hover:not(:disabled){color:#fff;background:#3d8f68;border-color:#3d8f68}
.dshp-notice{font-size:12px;line-height:16px}
.dshp-notice.is-ok{color:var(--dshp-ok)}
.dshp-notice.is-bad{color:var(--dshp-bad)}
.dshp-skel{height:12px;border-radius:4px;background:var(--dshp-fill);animation:dshp-pulse 1.2s var(--dshp-ease) infinite}
.dshp-active{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px;margin-bottom:12px;border-radius:8px}
.dshp-active b{font-family:inherit;font-weight:600}
.dshp-empty{padding:24px 12px;font-size:13px;color:var(--dshp-mute);text-align:center}
.dshp-split{display:flex;flex-direction:column;gap:12px}
.dshp-rulelist{display:flex;flex-direction:column;border-radius:8px;overflow:hidden}
.dshp-rulebody{max-height:240px;overflow:auto}
.dshp-ruleitem{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:0;border-bottom:1px solid var(--dshp-line);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dshp-ruleitem:hover{background:var(--dshp-fill)}
.dshp-ruleitem.is-edit{background:var(--dshp-accent-soft)}
.dshp-rule-main{flex:1;min-width:0}
.dshp-rule-name{display:flex;align-items:center;gap:8px;font-family:inherit;font-size:14px;line-height:20px;font-weight:600}
.dshp-rule-meta{display:block;margin-top:3px;font-family:var(--dshp-mono);font-size:11px;color:var(--dshp-mute)}
.dshp-rule-ops{display:flex;flex-direction:row;align-items:center;gap:6px;flex-shrink:0}
.dshp-create{display:flex;flex-direction:column;gap:8px;padding:12px;border-top:1px solid var(--dshp-line)}
.dshp-create-row{display:flex;gap:6px;align-items:center}
.dshp-create .dshp-field{flex:1;min-width:0;width:auto}
.dshp-editor{display:flex;flex-direction:column;gap:12px;min-width:0;border-radius:8px;padding:12px;min-height:320px}
.dshp-editor .dshp-area{flex:1;min-height:240px}
.dshp-editor-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dshp-mute);font-size:13px;min-height:160px}
.dshp-block{padding:16px 0;border-top:1px solid var(--dshp-line)}
.dshp-block-head{display:flex;align-items:center;gap:8px;margin:0 0 8px}
.dshp-block-head h4{margin:0;font-family:inherit;font-size:14px;line-height:20px;font-weight:600;flex:1;color:var(--dshp-ink)}
.dshp-block-hint{margin:8px 0 0;font-size:12px;line-height:1.55;color:var(--dshp-mute)}
.dshp-policy-row{display:flex;align-items:center;gap:8px}
.dshp-policy-row>label{font-size:12px;color:var(--dshp-mute);flex:0 0 auto}
.dshp-cwd-path{margin:0 0 8px;font-family:var(--dshp-mono);font-size:11px;color:var(--dshp-mute);word-break:break-all;line-height:1.5}
.dshp-cwd-list{display:flex;flex-direction:column;border-radius:8px;overflow:hidden}
.dshp-cwd-item{display:flex;align-items:flex-start;gap:8px;padding:12px;border-bottom:1px solid var(--dshp-line);cursor:pointer;margin:0}
.dshp-cwd-item:last-child{border-bottom:0}
.dshp-cwd-item:hover{background:var(--dshp-fill)}
.dshp-cwd-item.is-on{background:var(--dshp-accent-soft)}
.dshp-cwd-item input{margin:3px 0 0;flex:0 0 auto}
.dshp-cwd-main{flex:1;min-width:0}
.dshp-cwd-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:inherit;font-size:14px;line-height:20px;font-weight:600;color:var(--dshp-ink)}
.dshp-cwd-badge{font-family:var(--dshp-mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;padding:1px 7px;border-radius:99px;border:1px solid var(--dshp-line);color:var(--dshp-mute);line-height:1.6}
.dshp-cwd-size{font-family:var(--dshp-mono);font-size:11px;color:var(--dshp-mute)}
.dshp-cwd-sub{margin-top:3px;font-family:var(--dshp-mono);font-size:11px;color:var(--dshp-mute);word-break:break-all}
.dshp-cwd-prev{margin-top:4px;font-size:11px;line-height:1.5;color:var(--dshp-mute);max-height:34px;overflow:hidden}
@keyframes dshp-pulse{0%,100%{opacity:.4}50%{opacity:1}}
@media (max-width:640px){.dshp-metrics{grid-template-columns:1fr}.dshp-ruleitem{flex-wrap:wrap}.dshp-rule-ops{width:100%;justify-content:flex-end}}
.dshp-root em,.dshp-dock em,.rt-flow-action.inferred,.rt-ap-act.inferred{font-style:normal}
@media (prefers-reduced-motion:reduce){.dshp-btn,.dshp-bar>i,.dshp-flow-node{transition:opacity 300ms var(--dshp-ease)}.dshp-btn:hover:not(:disabled),.dshp-flow-node.is-cur{transform:none}.dshp-skel{animation:none}}

.dshp-dock{position:fixed;top:12px;right:12px;z-index:10050;display:flex;flex-direction:column;width:var(--dshp-dock-w,620px);height:var(--dshp-dock-h,72vh);min-width:380px;min-height:320px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);box-sizing:border-box;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,var(--dshp-paper,#fffcf7)) 52%,transparent);backdrop-filter:blur(22px) saturate(1.35);-webkit-backdrop-filter:blur(22px) saturate(1.35);border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,var(--dshp-line,#555)) 65%,transparent);border-radius:12px;box-shadow:0 18px 48px color-mix(in srgb,#000 30%,transparent),0 0 0 1px color-mix(in srgb,#fff 6%,transparent);pointer-events:auto;color:var(--dsw-alias-label-primary,var(--dshp-ink,#f2f2f2));overflow:visible}
.dshp-dock[data-open="0"]{display:none}
.dshp-launch{position:fixed;right:16px;bottom:16px;z-index:10040;appearance:none;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 55%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fffcf7) 46%,transparent);color:var(--dsw-alias-label-primary,#16140f);cursor:pointer;font:13px/1 inherit;box-shadow:0 8px 22px color-mix(in srgb,#000 28%,transparent);pointer-events:auto}
.dshp-launch:hover{border-color:var(--dsw-alias-brand-primary,#6dbf8c);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent)}
.dshp-launch[data-open="1"],.dshp-launch[data-hide="1"]{display:none}
.dshp-dock-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,var(--dshp-line,#555)) 55%,transparent);background:transparent;cursor:grab;user-select:none;touch-action:none;color:var(--dsw-alias-label-primary,var(--dshp-ink,#f2f2f2));border-radius:12px 12px 0 0}
.dshp-dock-head:active{cursor:grabbing}
.dshp-dock-head b{font-size:14px;font-weight:600;color:inherit;text-shadow:0 1px 0 color-mix(in srgb,#000 18%,transparent)}
/* 版本号：小字、等宽、低对比。它是要能看见，但不该抢标题的注意力。 */
.dshp-dock-ver{
  font-size:10px;
  line-height:1;
  font-weight:500;
  font-variant-numeric:tabular-nums;
  letter-spacing:.02em;
  padding:2px 5px;
  border-radius:4px;
  color:color-mix(in srgb,var(--dshp-mute,#b8b4ac) 88%,transparent);
  background:color-mix(in srgb,var(--dshp-mute,#b8b4ac) 12%,transparent);
  cursor:default;
  user-select:none;
  margin-left:2px;
}
.dshp-dock-head button{cursor:pointer;color:inherit;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,rgba(127,127,127,.18)) 55%,transparent)}
/* 中英切换。做成小胶囊，比图标按钮更容易一眼认出是「语言」而不是「设置」。 */
.dshp-lang-btn{
  cursor:pointer;
  font-size:11px;
  line-height:1;
  font-weight:600;
  letter-spacing:.02em;
  padding:4px 9px;
  border-radius:999px;
  color:inherit;
  background:color-mix(in srgb,var(--dshp-accent,#6ea8fe) 18%,transparent);
  border:1px solid color-mix(in srgb,var(--dshp-accent,#6ea8fe) 42%,transparent);
  transition:background .15s ease,border-color .15s ease,transform .1s ease;
}
.dshp-lang-btn:hover{
  background:color-mix(in srgb,var(--dshp-accent,#6ea8fe) 30%,transparent);
  border-color:color-mix(in srgb,var(--dshp-accent,#6ea8fe) 65%,transparent);
}
.dshp-lang-btn:active{transform:scale(.95)}
.dshp-lang-btn:focus-visible{outline:2px solid color-mix(in srgb,var(--dshp-accent,#6ea8fe) 70%,transparent);outline-offset:2px}
.dshp-dock-tabs{display:flex;gap:8px;padding:0 12px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,var(--dshp-line,#555)) 55%,transparent);background:transparent}
/* ── 破甲规则控件 ── */
.dshp-armor{display:flex;flex-direction:column;gap:10px;padding:4px 2px 12px;color:var(--dshp-ink,inherit)}
.dshp-armor-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dshp-armor-title{display:flex;align-items:baseline;gap:10px;min-width:0}
.dshp-armor-name{font-weight:650;font-size:14px}
.dshp-armor-count{font-size:12px;color:var(--dshp-mute,#b8b4ac);font-variant-numeric:tabular-nums}
.dshp-armor-actions{display:flex;gap:6px;flex-wrap:wrap}
.dshp-btn-ghost{background:transparent!important}
.dshp-btn-mini{padding:2px 8px!important;font-size:11px!important;line-height:16px!important;height:auto!important}
.dshp-armor-loading,.dshp-armor-err{font-size:12px;color:var(--dshp-mute,#b8b4ac);padding:12px 0}
.dshp-armor-err{color:#e2725b}
.dshp-armor-warn{font-size:11.5px;line-height:1.5;padding:8px 10px;border-radius:8px;color:#e0b341;background:color-mix(in srgb,#e0b341 12%,transparent);border:1px solid color-mix(in srgb,#e0b341 30%,transparent)}
.dshp-armor-groups{display:flex;flex-direction:column;gap:6px}
.dshp-armor-group{border:1px solid var(--dshp-line,rgba(128,128,128,.25));border-radius:10px;overflow:hidden;background:color-mix(in srgb,var(--dshp-paper,transparent) 60%,transparent)}
.dshp-armor-group.open{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 40%,var(--dshp-line,transparent))}
.dshp-armor-ghead{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;user-select:none;font-size:13px;min-width:0}
.dshp-armor-ghead:hover{background:color-mix(in srgb,#fff 5%,transparent)}
.dshp-armor-caret{width:12px;flex:none;color:var(--dshp-mute,#b8b4ac);font-size:10px}
.dshp-armor-glabel{font-weight:600;flex:none}
.dshp-armor-gcount{font-size:11px;color:var(--dshp-mute,#b8b4ac);font-variant-numeric:tabular-nums;flex:none}
.dshp-armor-ghint{font-size:11px;color:var(--dshp-mute,#b8b4ac);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.dshp-armor-body{display:flex;flex-direction:column;border-top:1px solid var(--dshp-line,rgba(128,128,128,.2));padding:4px 0}
.dshp-armor-row{display:flex;align-items:center;gap:8px;padding:6px 10px 6px 16px;font-size:12.5px;cursor:pointer;min-width:0}
.dshp-armor-row:hover{background:color-mix(in srgb,#fff 5%,transparent)}
.dshp-armor-row.absent{opacity:.42;cursor:not-allowed}
.dshp-armor-row input[type="checkbox"]{flex:none;margin:0;cursor:inherit}
.dshp-armor-id{flex:none;width:20px;text-align:right;font-size:11px;color:var(--dshp-mute,#b8b4ac);font-variant-numeric:tabular-nums}
.dshp-armor-rlabel{flex:none;font-weight:500;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-armor-short{flex:1;min-width:0;font-size:11px;color:var(--dshp-mute,#b8b4ac);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-armor-saving{flex:none;font-size:11px;color:var(--dsw-alias-brand-primary,#6dbf8c)}
/* ── 破甲规则：预设 / 筛选 / 强度标记 ── */
.dshp-armor-presets{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:2px 0}
.dshp-armor-plabel{flex:none;font-size:11px;color:var(--dshp-mute,#b8b4ac);margin-right:2px}
.dshp-armor-preset{flex:none}
.dshp-armor-preset.on{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 62%,transparent)!important;color:var(--dsw-alias-brand-primary,#6dbf8c)!important;font-weight:650}
.dshp-armor-filter{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dshp-armor-search{flex:1 1 160px;min-width:0;font-size:12px!important;padding:5px 9px!important;height:auto!important}
.dshp-armor-search::-webkit-search-cancel-button{cursor:pointer}
.dshp-armor-level{flex:none;font-size:11.5px!important;padding:5px 8px!important;height:auto!important;max-width:200px}
.dshp-armor-matched{flex:none;font-size:11px;color:var(--dshp-mute,#b8b4ac);font-variant-numeric:tabular-nums}
.dshp-armor-lv{flex:none;font-size:9.5px;line-height:1;padding:2px 5px;border-radius:4px;letter-spacing:.02em;font-weight:600}
.dshp-armor-lv.lv-core{color:#6dbf8c;background:color-mix(in srgb,#6dbf8c 15%,transparent)}
.dshp-armor-lv.lv-std{color:#8aa9c9;background:color-mix(in srgb,#8aa9c9 15%,transparent)}
.dshp-armor-lv.lv-agg{color:#e0b341;background:color-mix(in srgb,#e0b341 15%,transparent)}
/* ── 破甲引擎面板 ── */
.dshp-armor-sum{font-size:11.5px;line-height:1.55;color:var(--dshp-mute,#b8b4ac);margin:-4px 0 2px}
.dshp-armor-sub{font-size:12px;font-weight:650;color:var(--dshp-ink,inherit);margin:6px 0 2px;letter-spacing:0}
/* 自检条：通过时低调，失败时报警 */
.dshp-armor-audit{font-size:11px;line-height:1.5;color:var(--dshp-mute,#b8b4ac)}
.dshp-armor-audit.bad{color:#e2725b}
/* 分组色调：14 个分组靠左侧色条区分，不用满屏彩色 */
.dshp-armor-group[data-tone]{border-left-width:3px;border-left-style:solid}
.dshp-armor-group[data-tone="red"]{border-left-color:#e2725b}
.dshp-armor-group[data-tone="amber"]{border-left-color:#e0b341}
.dshp-armor-group[data-tone="green"]{border-left-color:#6dbf8c}
.dshp-armor-group[data-tone="cyan"]{border-left-color:#5fb0c9}
.dshp-armor-group[data-tone="violet"]{border-left-color:#9b8ac9}
.dshp-armor-group[data-tone="mute"]{border-left-color:var(--dshp-line,rgba(128,128,128,.35))}
/* 预设色调 */
.dshp-armor-preset[data-accent="red"].on{border-color:#e2725b!important;color:#e2725b!important}
.dshp-armor-preset[data-accent="amber"].on{border-color:#e0b341!important;color:#e0b341!important}
.dshp-armor-preset[data-accent="cyan"].on{border-color:#5fb0c9!important;color:#5fb0c9!important}
.dshp-armor-preset[data-accent="violet"].on{border-color:#9b8ac9!important;color:#9b8ac9!important}
/* NEW 徽标 */
.dshp-armor-new{flex:none;font-size:9px;line-height:1;padding:2px 4px;border-radius:3px;letter-spacing:.03em;font-weight:700;color:#9b8ac9;background:color-mix(in srgb,#9b8ac9 16%,transparent)}
/* 强度下拉里的计数 */
.dshp-armor-lvcount{color:var(--dshp-mute,#b8b4ac);font-variant-numeric:tabular-nums}
.dshp-eng-list{display:flex;flex-direction:column;gap:8px}
/* ── 三模式选择（preset 层）────────────────────────────────────────────── */
.dshp-mode{display:flex;flex-direction:column;gap:10px;margin-bottom:4px}
.dshp-mode-pick{margin-top:2px;width:100%;justify-content:center}
.dshp-mode-pick.cur{opacity:.5;cursor:default}
.dshp-btn.danger{border-color:color-mix(in srgb,#e0a24a 56%,transparent);background:color-mix(in srgb,#e0a24a 16%,transparent)}
.dshp-btn.danger:hover{background:color-mix(in srgb,#e0a24a 26%,transparent)}
.dshp-eng-seg{display:flex;gap:6px;padding:5px;border:1px solid var(--dshp-line,rgba(128,128,128,.22));border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-secondary,transparent) 42%,transparent);position:sticky;top:0;z-index:3;backdrop-filter:blur(8px)}
.dshp-eng-seg.busy{opacity:.7;pointer-events:none}
.dshp-eng-segb{flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 6px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer;transition:background .14s,border-color .14s,box-shadow .14s;min-width:0}
.dshp-eng-segb:hover:not(.on):not(.dead){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 10%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 26%,transparent)}
.dshp-eng-segb.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 62%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 28%,transparent);cursor:default}
.dshp-eng-segb.dead{opacity:.48;cursor:not-allowed}
.dshp-eng-segt{font-size:10px;line-height:1;letter-spacing:.06em;opacity:.62;font-variant-numeric:tabular-nums}
.dshp-eng-segn{font-size:12.5px;line-height:1.3;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dshp-eng-segs{font-size:10px;line-height:1;opacity:.8;color:var(--dsw-alias-state-error,#d9534f)}
@media (max-width:520px){.dshp-eng-segn{font-size:11.5px}.dshp-eng-segb{padding:7px 3px}}
/* ── 破甲档位卡（profile overlay 单选行）────────────── */
.dshp-prof{display:flex;flex-direction:column;gap:10px;margin:12px 0 0;padding:12px;border:1px solid var(--dshp-line,rgba(128,128,128,.22));border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-secondary,transparent) 32%,transparent)}
.dshp-prof-cur{display:flex;flex-direction:column;gap:5px;padding:10px 12px;border-radius:9px;border:1px solid var(--dshp-line,rgba(128,128,128,.22))}
.dshp-prof-currow{display:flex;align-items:center;gap:8px}
.dshp-prof-label{font-size:12px;font-weight:500;opacity:.75}
.dshp-prof-active{font-size:10px;line-height:1;padding:2px 6px;border-radius:4px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-brand-primary,#6dbf8c);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 16%,transparent)}
.dshp-prof-currow2{display:flex;align-items:baseline;gap:8px}
.dshp-prof-name{font-size:15px;font-weight:600;line-height:1.2}
.dshp-prof-id{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;opacity:.6}
.dshp-prof-desc{font-size:12px;line-height:1.5;opacity:.75}
.dshp-prof-rows{display:flex;flex-direction:column;gap:7px}
.dshp-prof-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;border-radius:9px;border:1px solid var(--dshp-line,rgba(128,128,128,.22));background:transparent;color:inherit;font:inherit;cursor:pointer;transition:background .14s,border-color .14s}
.dshp-prof-row:hover:not(.on):not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 8%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 32%,transparent)}
.dshp-prof-row.on{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 62%,transparent);cursor:default}
.dshp-prof-row:disabled{opacity:.62}
.dshp-prof-radio{width:16px;height:16px;flex:none;border-radius:999px;border:1.5px solid color-mix(in srgb,currentColor 32%,transparent);display:flex;align-items:center;justify-content:center}
.dshp-prof-radio.on{border-color:var(--dsw-alias-brand-primary,#6dbf8c)}
.dshp-prof-dot{width:8px;height:8px;border-radius:999px;background:var(--dsw-alias-brand-primary,#6dbf8c)}
.dshp-prof-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dshp-prof-nrow{display:flex;align-items:baseline;gap:6px}
.dshp-prof-nm{font-size:13px;font-weight:500;line-height:1.25}
.dshp-prof-pid{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;opacity:.6}
.dshp-prof-pdesc{font-size:11px;line-height:1.4;opacity:.68}
.dshp-prof-act{flex:none;font-size:12px;opacity:.6}
.dshp-prof-act.on{color:var(--dsw-alias-brand-primary,#6dbf8c);font-weight:600;opacity:1}
.dshp-prof-err{font-size:11.5px;padding:6px 9px;border-radius:6px;color:var(--dsw-alias-state-error,#d9534f);background:color-mix(in srgb,var(--dsw-alias-state-error,#d9534f) 12%,transparent)}
/* 补丁视图切换（全部 / 仅异常） */
.dshp-pv{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;position:sticky;top:0;z-index:4;padding:6px 0;backdrop-filter:blur(8px)}
.dshp-pv-seg{display:flex;gap:4px;padding:3px;border:1px solid var(--dshp-line,rgba(128,128,128,.22));border-radius:9px}
.dshp-pv-b{border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;padding:4px 10px;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums}
.dshp-pv-b:hover:not(.on){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 10%,transparent)}
.dshp-pv-b.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 58%,transparent);font-weight:600}
.dshp-pv-na{font-size:11px;opacity:.68;line-height:1.35}
/* 杂项页 */
.dshp-misc{display:flex;flex-direction:column;gap:10px}
.dshp-misc-card{border:1px solid var(--dshp-line,rgba(128,128,128,.25));border-radius:10px;background:color-mix(in srgb,var(--dshp-paper,transparent) 60%,transparent);overflow:hidden}
.dshp-misc-h{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
.dshp-misc-h:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 8%,transparent)}
.dshp-misc-h strong{font-size:13px;font-weight:650}
.dshp-misc-h .dshp-misc-n{margin-left:auto;font-size:11px;opacity:.7;font-variant-numeric:tabular-nums}
.dshp-misc-body{padding:2px 12px 12px;display:flex;flex-direction:column;gap:2px}
.dshp-misc-row{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid color-mix(in srgb,var(--dshp-line,currentColor) 45%,transparent)}
.dshp-misc-row:first-child{border-top:0}
.dshp-misc-lbl{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}
.dshp-misc-t{font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dshp-misc-d{font-size:11px;line-height:1.45;opacity:.72}
.dshp-misc-ctl{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding-top:1px}
.dshp-misc-ctl input[type=number]{width:52px;font:inherit;font-size:12px;padding:3px 6px;border-radius:6px;border:1px solid var(--dshp-line,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dshp-paper,transparent) 85%,transparent);color:inherit}
.dshp-misc-ctl input[type=text]{width:96px;font:inherit;font-size:12px;padding:3px 6px;border-radius:6px;border:1px solid var(--dshp-line,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dshp-paper,transparent) 85%,transparent);color:inherit}
.dshp-misc-ta{width:100%;max-width:420px;min-height:64px;box-sizing:border-box;font:12px/1.55 var(--dshp-mono,ui-monospace,monospace);padding:6px 8px;border-radius:6px;border:1px solid var(--dshp-line,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dshp-paper,transparent) 85%,transparent);color:inherit;resize:vertical}
.dshp-misc-ctl:has(.dshp-misc-ta){flex:1 1 100%;padding-top:2px}
.dshp-misc-row:has(.dshp-misc-ta){flex-wrap:wrap}
.dshp-misc-sw{position:relative;width:34px;height:19px;flex:none;border-radius:999px;border:1px solid var(--dshp-line,rgba(128,128,128,.4));background:color-mix(in srgb,#888 22%,transparent);cursor:pointer;transition:background .14s,border-color .14s;padding:0}
.dshp-misc-sw::after{content:"";position:absolute;top:1.5px;left:1.5px;width:14px;height:14px;border-radius:50%;background:currentColor;opacity:.85;transition:transform .14s}
.dshp-misc-sw.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 62%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 80%,transparent)}
.dshp-misc-sw.on::after{transform:translateX(15px);background:#fff;opacity:1}
.dshp-misc-sw:disabled{opacity:.45;cursor:not-allowed}
.dshp-misc-sw.locked{opacity:1;cursor:help;background:color-mix(in srgb,#888 28%,transparent);border-color:color-mix(in srgb,#888 45%,transparent)}
.dshp-misc-sw.locked::after{background:#fff;opacity:.85}
.dshp-misc-sw.locked:hover{background:color-mix(in srgb,#888 38%,transparent)}
.dshp-misc-lock{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;line-height:1;pointer-events:none;opacity:.9}
.dshp-misc-sw{position:relative}
.dshp-misc-row.locked .dshp-misc-t::after{content:"🔒";font-size:10px;opacity:.55;margin-left:2px}
.dshp-misc-note.warn{color:#e0b341;background:color-mix(in srgb,#e0b341 13%,transparent)}
/* 按钮内联加载态 */
.dshp-btn-loading{display:inline-flex;align-items:center;gap:6px}
.dshp-mode-pick.busy{cursor:progress}
/* 模式卡片：当前使用项左侧起一道主色条，选中项给环 */
.dshp-mode-card.is-on{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 55%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 28%,transparent)}
.dshp-mode-card.is-on::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:2.5px;border-radius:0 3px 3px 0;background:var(--dsw-alias-brand-primary,#6dbf8c)}
/* 弹窗出入 */
@keyframes dshp-fade-in{from{opacity:0}to{opacity:1}}
@keyframes dshp-dialog-in{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
/* 正在写的那一项：不置灰（置灰像坏了），用左侧色条 + 开关描边提示「在提交」 */
.dshp-misc-row.is-busy{position:relative}
.dshp-misc-row.is-busy::before{
	content:"";position:absolute;left:-12px;top:6px;bottom:6px;width:2px;border-radius:2px;
	background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 75%,transparent);
	animation:dshp-busy-bar .9s var(--dshp-t-inout) infinite;
}
@keyframes dshp-busy-bar{0%,100%{opacity:.35}50%{opacity:1}}
.dshp-misc-sw.busy{box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 22%,transparent)}
.dshp-misc-sw.busy::before{
	content:"";position:absolute;inset:-3px;border-radius:999px;
	border:1.5px solid transparent;
	border-top-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 90%,transparent);
	animation:dshp-rotate .7s linear infinite;
}
.dshp-misc-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:color-mix(in srgb,#888 18%,transparent);opacity:.85}
.dshp-misc-tag.warn{color:#e0b341;background:color-mix(in srgb,#e0b341 18%,transparent)}
.dshp-misc-note{font-size:11.5px;line-height:1.45;padding:7px 9px;border-radius:7px;margin:4px 0 8px}
.dshp-misc-note.ok{color:#6dbf8c;background:color-mix(in srgb,#6dbf8c 13%,transparent)}
.dshp-misc-note.error{color:#e2725b;background:color-mix(in srgb,#e2725b 13%,transparent)}
.dshp-eng-card{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid var(--dshp-line,rgba(128,128,128,.25));border-radius:10px;background:color-mix(in srgb,var(--dshp-paper,transparent) 60%,transparent);transition:border-color .16s ease,box-shadow .16s ease}
.dshp-eng-card:hover{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 34%,var(--dshp-line,transparent))}
.dshp-eng-card.on{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 62%,transparent);box-shadow:inset 3px 0 0 color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 85%,transparent)}
.dshp-eng-card.dead{opacity:.56}
.dshp-eng-head{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.dshp-eng-tier{flex:none;font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;padding:3px 6px;border-radius:5px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent);color:var(--dsw-alias-brand-primary,#6dbf8c)}
.dshp-eng-name{flex:none;font-weight:650;font-size:13.5px;color:var(--dshp-ink,inherit)}
.dshp-eng-state{flex:none;font-size:10.5px;padding:2px 7px;border-radius:999px;letter-spacing:.01em}
.dshp-eng-state.s-available{color:#6dbf8c;background:color-mix(in srgb,#6dbf8c 16%,transparent)}
.dshp-eng-state.s-degraded{color:#e0b341;background:color-mix(in srgb,#e0b341 16%,transparent)}
.dshp-eng-state.s-unavailable{color:#e2725b;background:color-mix(in srgb,#e2725b 16%,transparent)}
.dshp-eng-on{flex:none;font-size:11px;font-weight:600;color:var(--dsw-alias-brand-primary,#6dbf8c)}
.dshp-eng-tag{font-size:12px;color:color-mix(in srgb,var(--dshp-ink,inherit) 78%,transparent);font-weight:500}
.dshp-eng-sum{font-size:11.5px;line-height:1.6;color:var(--dshp-mute,#b8b4ac)}
.dshp-eng-flags{display:flex;gap:12px;flex-wrap:wrap}
.dshp-eng-flag{font-size:10.5px;color:var(--dshp-mute,#b8b4ac);font-variant-numeric:tabular-nums}
.dshp-eng-flag.warn{color:var(--dshp-warn,#8a5a12);border-color:color-mix(in srgb,var(--dshp-warn,#8a5a12) 32%,transparent)}
.dshp-eng-cols{display:flex;gap:14px;flex-wrap:wrap;margin-top:2px}
.dshp-eng-col{flex:1 1 200px;min-width:0}
.dshp-eng-ch{font-size:10.5px;font-weight:650;color:#6dbf8c;margin-bottom:3px;letter-spacing:.02em}
.dshp-eng-ch.bad{color:#e0b341}
.dshp-eng-ul{margin:0;padding-left:15px;display:flex;flex-direction:column;gap:2px}
.dshp-eng-ul li{font-size:11px;line-height:1.55;color:var(--dshp-mute,#b8b4ac)}
.dshp-eng-best{font-size:11px;color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 82%,var(--dshp-mute,#b8b4ac));border-top:1px dashed var(--dshp-line,rgba(128,128,128,.22));padding-top:5px;margin-top:2px}
.dshp-eng-note{font-size:10.5px;line-height:1.55;color:#e0b341;background:color-mix(in srgb,#e0b341 9%,transparent);border-radius:6px;padding:5px 8px}
.dshp-eng-opts{display:flex;flex-direction:column;gap:2px;border:1px solid var(--dshp-line,rgba(128,128,128,.22));border-radius:10px;padding:6px 10px;background:color-mix(in srgb,var(--dshp-paper,transparent) 50%,transparent)}
.dshp-eng-opt{display:flex;align-items:baseline;gap:8px;padding:5px 2px;font-size:12px;cursor:pointer;min-width:0;border-bottom:1px solid color-mix(in srgb,var(--dshp-line,rgba(128,128,128,.2)) 50%,transparent)}
.dshp-eng-opt:last-child{border-bottom:0}
.dshp-eng-opt:hover{background:color-mix(in srgb,#fff 4%,transparent);border-radius:6px}
.dshp-eng-opt input[type="checkbox"]{flex:none;margin:0;cursor:inherit;align-self:center}
.dshp-eng-optl{flex:none;font-weight:550;color:var(--dshp-ink,inherit);min-width:84px}
.dshp-eng-optm{flex:none;font-size:9.5px;line-height:1.4;padding:1px 5px;border-radius:5px;
  color:#6dbf8c;border:1px solid color-mix(in srgb,#6dbf8c 42%,transparent);
  background:color-mix(in srgb,#6dbf8c 12%,transparent);white-space:nowrap}
.dshp-eng-opth{flex:1;min-width:0;font-size:10.5px;line-height:1.5;color:var(--dshp-mute,#b8b4ac)}
/* ── 引擎应用栏（点选只改草稿，必须按应用才落盘）── */
.dshp-eng-applybar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  margin:8px 0 2px;padding:9px 11px;border-radius:10px;
  border:1px solid color-mix(in srgb,#e0a53b 40%,transparent);
  background:color-mix(in srgb,#e0a53b 9%,transparent);
  animation:dshp-pop .16s cubic-bezier(.22,1.2,.36,1)}
.dshp-eng-applynote{font-size:11.5px;line-height:1.5;color:var(--dshp-ink,inherit);min-width:0}
.dshp-eng-segs.draft{color:#e0a53b;font-weight:600}
.dshp-eng-segb.draft{border-color:color-mix(in srgb,#e0a53b 55%,transparent);
  background:color-mix(in srgb,#e0a53b 12%,transparent)}
.dshp-btn.primary{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 88%,#000);
  color:#fff;border-color:transparent;font-weight:600}
.dshp-btn.primary:hover:not(:disabled){filter:brightness(1.08)}
.dshp-btn.ghost{background:transparent;border-color:var(--dshp-line,rgba(128,128,128,.3))}
.dshp-btn.ghost:hover:not(:disabled){background:color-mix(in srgb,#fff 6%,transparent)}
/* ── 能力矩阵 ── */.dshp-caps{display:flex;flex-wrap:wrap;gap:5px;margin:2px 0 6px}
.dshp-cap{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;font-size:11px;line-height:1.35;
  border-radius:999px;border:1px solid var(--dshp-line,rgba(128,128,128,.24));
  background:transparent;color:var(--dshp-mute,#b8b4ac);cursor:default;transition:background .12s,border-color .12s,opacity .12s}
.dshp-cap.on{color:var(--dshp-ink,inherit);border-color:color-mix(in srgb,#6dbf8c 44%,transparent);
  background:color-mix(in srgb,#6dbf8c 10%,transparent)}
.dshp-cap.off{opacity:.62}
.dshp-cap.locked{cursor:pointer;opacity:.72;border-style:dashed}
.dshp-cap.locked:hover{opacity:1;background:color-mix(in srgb,#e2725b 10%,transparent);
  border-color:color-mix(in srgb,#e2725b 44%,transparent)}
.dshp-cap-dot{width:5px;height:5px;border-radius:50%;flex:none;background:currentColor;opacity:.75}
.dshp-cap.on .dshp-cap-dot{background:#6dbf8c;opacity:1}
.dshp-cap-l{white-space:nowrap}
.dshp-cap-lock{font-size:9.5px;line-height:1;opacity:.85}
/* 选项被锁时的视觉 */
.dshp-eng-opt.locked{cursor:not-allowed;opacity:.66}
.dshp-eng-opt.locked:hover{background:color-mix(in srgb,#e2725b 7%,transparent);border-radius:6px}
/* ── 锁定提示弹层 ── */
.dshp-cap-mask{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;
  padding:20px;background:rgba(0,0,0,.42);backdrop-filter:blur(2px);animation:dshp-fade .14s ease-out}
.dshp-cap-modal{max-width:420px;width:100%;border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;
  background:var(--dsw-alias-bg-elevated,#22201d);color:var(--dshp-ink,inherit);
  border:1px solid color-mix(in srgb,#e2725b 30%,transparent);
  box-shadow:0 16px 44px rgba(0,0,0,.46);animation:dshp-pop .18s cubic-bezier(.22,1.2,.36,1)}
.dshp-cap-mhead{display:flex;align-items:center;gap:8px}
.dshp-cap-mlock{font-size:15px;line-height:1}
.dshp-cap-mtitle{font-size:13.5px;font-weight:650}
.dshp-cap-mbody{font-size:12px;line-height:1.72;color:var(--dshp-mute,#b8b4ac);white-space:pre-wrap}
.dshp-cap-mfoot{display:flex;justify-content:flex-end}
@keyframes dshp-fade{from{opacity:0}to{opacity:1}}
@keyframes dshp-pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
.dshp-eng-notes{margin:2px 0 0}
.dshp-eng-report{display:flex;flex-direction:column;gap:4px;border-radius:10px;padding:9px 11px;border:1px solid;margin-top:6px;max-height:190px;overflow-y:auto;overscroll-behavior:contain}
/* 自检报告有 8 行步骤，展开后会把下面的引擎切换挤下去。
   限高 + 内部滚动：报告本身完整可读，但不会把整页撑长。 */
.dshp-eng-report::-webkit-scrollbar{width:6px}
.dshp-eng-report::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dshp-mute,#b8b4ac) 38%,transparent);border-radius:3px}
.dshp-eng-report::-webkit-scrollbar-track{background:transparent}
.dshp-eng-report .dshp-eng-step{font-size:10.5px;line-height:1.45}
.dshp-eng-report .dshp-eng-sd{color:var(--dshp-mute,#b8b4ac);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-eng-report.ok{border-color:color-mix(in srgb,#6dbf8c 38%,transparent);background:color-mix(in srgb,#6dbf8c 8%,transparent)}
.dshp-eng-report.bad{border-color:color-mix(in srgb,#e2725b 42%,transparent);background:color-mix(in srgb,#e2725b 8%,transparent)}
.dshp-eng-rhead{font-size:12px;font-weight:650;color:var(--dshp-ink,inherit)}
.dshp-eng-bytes{font-size:10.5px;color:var(--dshp-mute,#b8b4ac);font-variant-numeric:tabular-nums}
.dshp-eng-step{display:flex;align-items:baseline;gap:8px;font-size:11px;line-height:1.55;min-width:0}
.dshp-eng-mark{flex:none;width:12px;font-weight:700}
.dshp-eng-mark.ok{color:#6dbf8c}
.dshp-eng-mark.bad{color:#e2725b}
.dshp-eng-sl{flex:none;min-width:74px;font-weight:550;color:var(--dshp-ink,inherit)}
.dshp-eng-sd{flex:1;min-width:0;color:var(--dshp-mute,#b8b4ac);word-break:break-word}
.dshp-eng-probe{display:flex;flex-direction:column;gap:3px;border:1px solid var(--dshp-line,rgba(128,128,128,.22));border-radius:10px;padding:8px 12px;background:color-mix(in srgb,var(--dshp-paper,transparent) 46%,transparent)}
.dshp-eng-prow{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:11px;min-width:0}
.dshp-eng-prow>span{flex:none;color:var(--dshp-mute,#b8b4ac)}
.dshp-eng-prow>code{flex:1;min-width:0;text-align:right;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dshp-ink,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl}
.dshp-dock-tab{appearance:none;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,var(--dshp-mute,#b8b4ac));border-radius:0;padding:8px 12px;margin-bottom:-1px;cursor:pointer;font:13px/1.2 inherit;text-shadow:0 1px 0 color-mix(in srgb,#000 12%,transparent)}
.dshp-dock-tab:hover{color:var(--dsw-alias-label-primary,var(--dshp-ink,#f2f2f2))}
.dshp-dock-tab.on{color:var(--dsw-alias-label-primary,var(--dshp-ink,#f2f2f2));font-weight:600;border-bottom-color:var(--dsw-alias-brand-primary,#6dbf8c);background:transparent}
.dshp-dock-body{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;background:transparent;border-radius:0 0 12px 12px}
.dshp-dock-body .dshp-root{max-width:none;height:100%;flex:1;min-height:0;overflow:auto;background:transparent!important;padding:12px;gap:12px}
.dshp-dock-body .dshp-panel{padding:12px}
.dshp-dock-body .dshp-head{margin-bottom:12px}
.dshp-dock-body .dshp-sub{margin:16px 0 8px}
.dshp-dock-body .dshp-metrics{margin-bottom:12px}
.dshp-dock-body .dshp-panel,.dshp-dock-body .dshp-metric,.dshp-dock-body .dshp-group,.dshp-dock-body .dshp-editor,.dshp-dock-body .dshp-active,.dshp-dock-body .dshp-ask,.dshp-dock-body .dshp-create,.dshp-dock-body .dshp-rulelist,.dshp-dock-body .dshp-cwd-list{background:var(--dshp-paper)!important;border-color:var(--dshp-line)!important;color:var(--dshp-ink)!important;box-shadow:inset 0 1px 0 var(--dshp-hi);backdrop-filter:var(--dshp-glass);-webkit-backdrop-filter:var(--dshp-glass)}
.dshp-dock-body .dshp-field,.dshp-dock-body .dshp-area{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 38%,transparent)!important;color:var(--dshp-ink)!important;border-color:var(--dshp-line)!important}
.dshp-dock-body select.dshp-field,.dshp-dock-body .dshp-field.dshp-ver{background:var(--dsw-alias-bg-layer-1,#fff)!important;color:var(--dshp-ink)!important;color-scheme:inherit}
.dshp-dock[data-theme="white"] select.dshp-field option,.dshp-dock[data-theme="white"] .dshp-field.dshp-ver option{background:#fff;color:#16140f}
.dshp-dock[data-theme="dusk"] select.dshp-field option,.dshp-dock[data-theme="dusk"] .dshp-field.dshp-ver option{background:#1b1d22;color:#f4f1ea}
.dshp-dock-body .dshp-title,.dshp-dock-body .dshp-sub h4,.dshp-dock-body .dshp-group-h strong,.dshp-dock-body .dshp-metric b,.dshp-dock-body .dshp-rule-name{font-family:inherit;font-weight:650;letter-spacing:0;color:var(--dshp-ink)!important;text-shadow:none}
.dshp-dock-body .dshp-mute,.dshp-dock-body .dshp-kicker,.dshp-dock-body .dshp-metric span,.dshp-dock-body .dshp-group-h em,.dshp-dock-body .dshp-count,.dshp-dock-body .dshp-rule-meta,.dshp-dock-body .dshp-hint{color:var(--dshp-mute)!important;font-weight:500;text-shadow:none}
.dshp-dock-body .rt-dock{position:relative;inset:auto;width:100%!important;height:100%;max-width:none!important;flex:1;min-height:0;min-width:0;display:flex!important;flex-direction:column;box-shadow:none;border:0;transform:none!important;opacity:1!important;pointer-events:auto!important;background:transparent!important}
.dshp-dock-body .rt-grip{display:none!important}
.dshp-dock-body .rt-embedded>.rt-head,.dshp-dock-body .rt-tabs,.dshp-dock-body .rt-foot{flex:none}
.dshp-dock-body .rt-body{flex:1;min-height:0;overflow:hidden!important;background:transparent!important}
.dshp-dock-body .rt-main{min-height:0;flex:1;overflow:hidden}
.dshp-dock-body .rt-pane{min-height:0;overflow:auto!important}
.dshp-dock-body .rt-embedded>.rt-head{padding:8px 12px}
.dshp-dock-body .rt-embedded>.rt-head .rt-title{font-size:14px;letter-spacing:0}
.dshp-dock-body .rt-tabs{gap:8px;padding:0 12px;flex-wrap:wrap}
.dshp-dock-body .rt-tab{border-radius:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:8px 12px;background:transparent;font-size:14px}
.dshp-dock-body .rt-tab.on{border-bottom-color:var(--dsw-alias-brand-primary,#6d8f78);background:transparent;font-weight:650}
.dshp-dock-body .rt-row:hover,.dshp-dock-body .rt-item:hover,.dshp-dock-body .rt-item.on,.dshp-dock-body .rt-seg:hover,.dshp-dock-body .rt-seg.on,.dshp-dock-body .rt-vrow:hover,.dshp-dock-body .rt-score-row:hover{background:var(--rt-surf-2)!important}
body:not([data-ds-dark-theme]) .dshp-auth-modal{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fffcf7) 46%,transparent);color:var(--dsw-alias-label-primary,#1a1916);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6d8f78) 34%,transparent);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 48%,transparent)}
body:not([data-ds-dark-theme]) .dshp-auth-legal{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#f3f0e8) 90%,transparent);color:var(--dsw-alias-label-primary,#1a1916);border-color:color-mix(in srgb,var(--dsw-alias-border-l1,#c9c3b6) 80%,transparent)}
body:not([data-ds-dark-theme]) .dshp-auth-warn{background:color-mix(in srgb,#f5e6c8 88%,transparent);color:#6b4a10}
body:not([data-ds-dark-theme]) .dshp-auth-ops button{border-color:var(--dsw-alias-border-l1,#c9c3b6);color:var(--dsw-alias-label-primary,#1a1916);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 88%,transparent)}
body:not([data-ds-dark-theme]) .dshp-auth-ops button.primary{background:var(--dsw-alias-brand-primary,#3f6b52);border-color:var(--dsw-alias-brand-primary,#3f6b52);color:#fff}
.dshp-dock-resize,.dshp-dock-resize-l,.dshp-dock-resize-r,.dshp-dock-resize-b{position:absolute;z-index:60;pointer-events:auto;touch-action:none}
.dshp-dock-resize{right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 46%,color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 75%,transparent) 46%);border-radius:0 0 12px 0;opacity:.95}
.dshp-dock-resize-l{left:-2px;top:0;bottom:0;width:10px;cursor:ew-resize;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent)}
.dshp-dock-resize-l:hover,.dshp-dock-resize-r:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 42%,transparent)}
.dshp-dock-resize-r{right:-2px;top:0;bottom:22px;width:10px;cursor:ew-resize;background:transparent}
.dshp-dock-resize-b{left:10px;right:22px;bottom:-2px;height:10px;cursor:ns-resize;background:transparent}
.dshp-dock-resize-b:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 35%,transparent)}
.dshp-auth-mask{position:fixed;inset:0;z-index:10100;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px;pointer-events:auto}
.dshp-env-gate{z-index:10200}
.dshp-auth-modal{width:min(680px,100%);max-height:min(88vh,820px);display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6d8f78) 34%,transparent);border-radius:16px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 42%,transparent);color:var(--dsw-alias-label-primary,#eee);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 10%,transparent)}
.dshp-auth-modal h2{margin:0;font-size:16px;font-weight:600}
.dshp-auth-warn{padding:8px 10px;border-radius:8px;background:#3a2e18;color:#f0d48a;font-size:13px}
.dshp-auth-legal{overflow:auto;height:300px;margin:0;padding:12px;border:1px solid var(--dshp-line,var(--dsw-alias-border-l1,#333));border-radius:8px;background:var(--dshp-paper,color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 42%,transparent));font-size:13px;line-height:1.55}
.dshp-auth-legal h3{margin:12px 0 4px;font-size:13px}
.dshp-auth-legal h3:first-child{margin-top:0}
.dshp-auth-legal p{margin:0 0 8px}
.dshp-auth-checks{display:flex;flex-direction:column;gap:8px;font-size:13px}
.dshp-auth-checks label{display:flex;gap:8px;align-items:flex-start}
.dshp-auth-checks label.locked{opacity:.45}
.dshp-auth-ops{display:flex;justify-content:flex-end;gap:8px}
.dshp-auth-ops button,.dshp-dock-head button{appearance:none;border:1px solid var(--dsw-alias-border-l1,#444);background:transparent;color:inherit;border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit}
.dshp-auth-ops button.primary{background:#2a4033;border-color:#8fbf9a}
.dshp-auth-ops button:disabled{opacity:.45;cursor:default}
.dshp-icon-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 45%,transparent);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,currentColor);cursor:pointer;font:13px/1 inherit;white-space:nowrap;flex:0 0 auto}
.dshp-icon-btn:hover{border-color:var(--dsw-alias-brand-primary,#6dbf8c);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 12%,transparent);color:var(--dsw-alias-label-primary,currentColor)}
.dshp-icon-btn.on{border-color:var(--dsw-alias-brand-primary,#6dbf8c);color:var(--dsw-alias-brand-primary,#6dbf8c);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 16%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 28%,transparent)}
.dshp-hbtn{appearance:none;display:inline-flex;flex:0 0 auto;align-items:center;gap:6px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 55%,transparent);background:transparent;color:var(--dsw-alias-label-secondary,currentColor);cursor:pointer;font:12px/1 inherit;padding:5px 10px;border-radius:8px;white-space:nowrap}
.dshp-hbtn:hover{border-color:var(--dsw-alias-brand-primary,#6dbf8c);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 12%,transparent);color:var(--dsw-alias-label-primary,currentColor)}
.dshp-hbtn.on{border-color:var(--dsw-alias-brand-primary,#6dbf8c);color:var(--dsw-alias-brand-primary,#6dbf8c);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 32%,transparent)}
.dshp-live-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-brand-primary,#6dbf8c);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 28%,transparent)}
.dshp-hero-chip{display:inline-flex;align-items:center;margin-left:6px;flex:0 0 auto}
.dshp-hero-chip-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 50%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 10%,transparent);color:var(--dsw-alias-label-primary,currentColor);cursor:pointer;font:12.5px/1 inherit;white-space:nowrap}
.dshp-hero-chip-btn:hover{border-color:var(--dsw-alias-brand-primary,#6dbf8c);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent)}
.dshp-hero-chip-btn.on{border-color:var(--dsw-alias-brand-primary,#6dbf8c);color:var(--dsw-alias-brand-primary,#6dbf8c);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 32%,transparent)}
.dshp-tab-chip{display:inline-flex;align-items:flex-end;flex:0 0 auto}
.dshp-tab-btn{appearance:none;position:relative;border:none;background:transparent;cursor:pointer;padding:0 0 9px;font:500 13px/16px inherit;color:var(--dsw-alias-label-tertiary,currentColor);white-space:nowrap}
.dshp-tab-btn:hover{color:var(--dsw-alias-label-primary,currentColor)}
.dshp-tab-btn.on{color:var(--dsw-alias-brand-primary,#6dbf8c)}
.dshp-tab-btn.on:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px;background:var(--dsw-alias-brand-primary,#6dbf8c)}
/* 宿主工具条按钮常继承图标字体 / font-size:0 / color:transparent，字在 DOM 里但看不见（#169）。 */
.dshp-hero-chip-btn,.dshp-tab-btn,.dshp-launch,.dshp-icon-btn,.dshp-hbtn,.dshp-btn,.dshp-dock-tab,.dshp-dock-head button,.dshp-auth-ops button,.dshp-switch button{
  font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif!important;
  -webkit-text-fill-color:currentColor!important;
  text-indent:0!important;
  letter-spacing:normal!important;
  overflow:visible!important;
  text-overflow:clip!important;
  width:auto!important;
  max-width:none!important;
}
.dshp-hero-chip-btn{
  font-size:12.5px!important;
  line-height:1!important;
  font-weight:600!important;
  color:#1a1916!important;
  -webkit-text-fill-color:#1a1916!important;
  min-width:max-content!important;
  height:28px!important;
  padding:0 12px!important;
}
.dshp-hero-chip-btn.on{color:#2f6b4f!important;-webkit-text-fill-color:#2f6b4f!important}
body[data-ds-dark-theme] .dshp-hero-chip-btn,.dshp-dock[data-theme="dusk"] .dshp-hero-chip-btn{color:#f4f1ea!important;-webkit-text-fill-color:#f4f1ea!important}
body[data-ds-dark-theme] .dshp-hero-chip-btn.on,.dshp-dock[data-theme="dusk"] .dshp-hero-chip-btn.on{color:#6dbf8c!important;-webkit-text-fill-color:#6dbf8c!important}
.dshp-tab-btn{font-size:13px!important;line-height:16px!important;font-weight:500!important;color:#5c564c!important;-webkit-text-fill-color:#5c564c!important;padding:0 4px 9px!important}
.dshp-tab-btn.on{color:#2f6b4f!important;-webkit-text-fill-color:#2f6b4f!important}
body[data-ds-dark-theme] .dshp-tab-btn{color:#c9c3b8!important;-webkit-text-fill-color:#c9c3b8!important}
body[data-ds-dark-theme] .dshp-tab-btn.on{color:#6dbf8c!important;-webkit-text-fill-color:#6dbf8c!important}
.dshp-launch{font-size:13px!important;line-height:1!important;font-weight:600!important;min-width:max-content!important}
.dshp-btn{font-size:16px!important;line-height:24px!important;font-weight:600!important}
.dshp-btn-primary{color:#fff!important;-webkit-text-fill-color:#fff!important}
.dshp-btn-tiny{font-size:14px!important;line-height:20px!important}
/* Glass follows the host color. Weight and background opacity are kept separate: the shell is translucent, the text sits on a more solid layer. */
.dshp-dock{font-family:inherit;font-size:14px;line-height:1.6;font-weight:500;-webkit-font-smoothing:antialiased;text-shadow:none}
.dshp-dock[data-theme="white"],.dshp-dock[data-theme="dusk"]{backdrop-filter:blur(22px) saturate(1.4)!important;-webkit-backdrop-filter:blur(22px) saturate(1.4)!important;color:var(--dshp-ink)!important;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6d8f78) 34%,transparent)!important;--dshp-glass:blur(18px) saturate(1.35);--dshp-accent:var(--dsw-alias-brand-primary,#3d8f68);--dshp-fill:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 14%,transparent)}
.dshp-dock[data-theme="white"]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fffcf7) 46%,transparent)!important;--dshp-paper:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fffcf7) 46%,transparent);--dshp-line:color-mix(in srgb,var(--dsw-alias-brand-primary,#6d8f78) 34%,transparent);--dshp-hi:color-mix(in srgb,#fff 48%,transparent);--dshp-ink:var(--dsw-alias-label-primary,#16140f);--dshp-mute:color-mix(in srgb,var(--dsw-alias-label-primary,#16140f) 76%,var(--dsw-alias-label-secondary,#3c362e));--dshp-ok:#2f6b4f;--dshp-warn:#8a5a12;--dshp-bad:#9a3434;box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 48%,transparent),0 16px 40px color-mix(in srgb,#000 16%,transparent)!important}
.dshp-dock[data-theme="dusk"]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 42%,transparent)!important;--dshp-paper:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 42%,transparent);--dshp-line:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 32%,transparent);--dshp-hi:color-mix(in srgb,#fff 10%,transparent);--dshp-ink:var(--dsw-alias-label-primary,#f4f1ea);--dshp-mute:color-mix(in srgb,var(--dsw-alias-label-primary,#f4f1ea) 84%,var(--dsw-alias-label-secondary,#c9c3b8));--dshp-ok:#8fd0a8;--dshp-warn:#e4c48a;--dshp-bad:#f0b4b4;box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 10%,transparent),0 16px 40px color-mix(in srgb,#000 28%,transparent)!important}
.dshp-dock .dshp-dock-head,.dshp-dock .dshp-dock-tabs{background:transparent!important;color:var(--dshp-ink)!important}
.dshp-dock .dshp-dock-head,.dshp-dock .dshp-dock-head b,.dshp-dock .dshp-dock-head button,.dshp-dock .dshp-dock-tab,.dshp-dock .dshp-dock-tab.on{color:var(--dshp-ink)!important;text-shadow:none!important;font-weight:600}
.dshp-dock .dshp-dock-tab{font-size:14px}
.dshp-dock .dshp-dock-tab.on{border-bottom-color:var(--dsw-alias-brand-primary,#6d8f78)!important}
.dshp-dock-body .rt-dock{font-size:14px!important;line-height:1.6!important;font-weight:500!important;color:var(--dshp-ink)!important;--rt-ink:var(--dshp-ink);--rt-mute:var(--dshp-mute);--rt-paper:var(--dshp-paper);--rt-paper-2:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fffcf7) 28%,transparent);--rt-well:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 32%,transparent);--rt-fill:var(--dshp-fill);--rt-surf:var(--dshp-paper);--rt-surf-2:var(--dshp-fill);--rt-line:var(--dshp-line);--rt-hi:var(--dshp-hi);--rt-glass:var(--dshp-glass);--rt-accent:var(--dshp-accent);--rt-ok:var(--dshp-ok);--rt-warn:var(--dshp-warn);--rt-bad:var(--dshp-bad)}
.dshp-dock[data-theme="dusk"] .dshp-dock-body .rt-dock{--rt-paper-2:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 28%,transparent);--rt-well:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 26%,transparent)}
body[data-ds-dark-theme] .dshp-launch{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1e24) 42%,transparent);color:var(--dsw-alias-label-primary,#f4f1ea)}
.dshp-dock-body .rt-title,.dshp-dock-body .rt-tab,.dshp-dock-body .rt-tab.on,.dshp-dock-body .rt-card,.dshp-dock-body .rt-card h4,.dshp-dock-body .rt-row,.dshp-dock-body .rt-vrow,.dshp-dock-body .rt-kv,.dshp-dock-body .rt-kv b,.dshp-dock-body .rt-kv span,.dshp-dock-body .rt-mono,.dshp-dock-body .rt-empty,.dshp-dock-body .rt-foot,.dshp-dock-body .rt-tag,.dshp-dock-body .rt-item,.dshp-dock-body .rt-item-name,.dshp-dock-body .rt-item-desc,.dshp-dock-body .rt-sec-sub,.dshp-dock-body .rt-kb-sub,.dshp-dock-body .rt-seg-cidr,.dshp-dock-body .rt-seg-meta,.dshp-dock-body .rt-section,.dshp-dock-body .rt-note,.dshp-dock-body .rt-hint{color:var(--dshp-ink)!important;text-shadow:none!important;opacity:1!important}
.dshp-dock-body .rt-tab,.dshp-dock-body .rt-foot,.dshp-dock-body .rt-empty,.dshp-dock-body .rt-item-desc,.dshp-dock-body .rt-kb-sub,.dshp-dock-body .rt-kv span,.dshp-dock-body .rt-tag,.dshp-dock-body .rt-sec-sub{color:var(--dshp-mute)!important}
.dshp-dock-body .rt-card,.dshp-dock-body .rt-sess,.dshp-dock-body .rt-hit,.dshp-dock-body .rt-cred,.dshp-dock-body .rt-evi,.dshp-dock-body .rt-kb,.dshp-dock-body .rt-rep,.dshp-dock-body .rt-flow-node,.dshp-dock-body .rt-hcol{background:var(--dshp-paper)!important;border-color:var(--dshp-line)!important;color:var(--dshp-ink)!important;box-shadow:inset 0 1px 0 var(--dshp-hi)!important;backdrop-filter:var(--dshp-glass);-webkit-backdrop-filter:var(--dshp-glass)}
.dshp-dock-body .rt-pane,.dshp-dock-body .rt-side,.dshp-dock-body .rt-list,.dshp-dock-body .rt-table,.dshp-dock-body .rt-toolbar,.dshp-dock-body .rt-embedded>.rt-head,.dshp-dock-body .rt-tabs,.dshp-dock-body .rt-foot,.dshp-dock-body .rt-livebar,.dshp-dock-body .rt-concl{background:transparent!important;box-shadow:none!important}
.dshp-dock-body .rt-btn,.dshp-dock-body .rt-input,.dshp-dock-body .rt-eng-select,.dshp-dock-body textarea.rt-input,.dshp-dock-body .rt-textarea,.dshp-dock-body .rt-code,.dshp-dock-body .rt-evi-body{background:var(--rt-well)!important;color:var(--dshp-ink)!important;border-color:var(--dshp-line)!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.dshp-dock-body .rt-btn-primary{background:var(--dsw-alias-brand-primary,#3f6b52)!important;border-color:var(--dsw-alias-brand-primary,#3f6b52)!important;color:#fff!important}
.dshp-dock[data-theme="white"] .dshp-dock-body .rt-eng-select option,.dshp-dock[data-theme="white"] .dshp-dock-body .rt-input option{background:#fff;color:#16140f}
.dshp-dock[data-theme="dusk"] .dshp-dock-body .rt-eng-select option,.dshp-dock[data-theme="dusk"] .dshp-dock-body .rt-input option{background:#1b1d22;color:#f4f1ea}
.dshp-dock-body .rt-err{font-weight:650}
.dshp-dock[data-theme="white"] .dshp-dock-body .rt-err{color:#9a3434!important}
.dshp-dock[data-theme="dusk"] .dshp-dock-body .rt-err{color:#f0b4b4!important}
.dshp-dock-body .rt-rep-http,.dshp-dock-body pre{background:var(--rt-well)!important;color:var(--dshp-ink)!important;border:1px solid var(--dshp-line)!important}
/* #196：暗色宿主里 --dsw-alias-brand-primary 解析为近白色（neutral-bluish-50 #f9fafb），
   任何“品牌色作底 + 白字”的按钮都会变成白底白字。暗色下主按钮统一改用绿色实底。 */
body[data-ds-dark-theme] .dshp-btn-primary,
.dshp-root[data-theme="dusk"] .dshp-btn-primary,
.dshp-dock[data-theme="dusk"] .dshp-btn-primary,
.dshp-restart-mask[data-theme="dusk"] .dshp-btn-primary{background:#3d8f68!important;border-color:#3d8f68!important;color:#fff!important;-webkit-text-fill-color:#fff!important}
body[data-ds-dark-theme] .dshp-btn-primary:hover:not(:disabled),
.dshp-root[data-theme="dusk"] .dshp-btn-primary:hover:not(:disabled),
.dshp-dock[data-theme="dusk"] .dshp-btn-primary:hover:not(:disabled),
.dshp-restart-mask[data-theme="dusk"] .dshp-btn-primary:hover:not(:disabled){background:#347a59!important;border-color:#347a59!important;color:#fff!important;-webkit-text-fill-color:#fff!important}
body[data-ds-dark-theme] .rt-btn-primary,
body[data-ds-dark-theme] .rt-btn-primary:hover:not(:disabled),
.dshp-dock[data-theme="dusk"] .rt-btn-primary,
.dshp-dock[data-theme="dusk"] .rt-btn-primary:hover:not(:disabled),
body[data-ds-dark-theme] .dshp-dock-body .rt-btn-primary,
.dshp-dock[data-theme="dusk"] .dshp-dock-body .rt-btn-primary{background:#3d8f68!important;border-color:#3d8f68!important;color:#fff!important;-webkit-text-fill-color:#fff!important;backdrop-filter:none}
body[data-ds-dark-theme] .rt-rep-step-no,.dshp-dock[data-theme="dusk"] .rt-rep-step-no{background:#3d8f68;color:#fff}
/* ===== 交互反馈层 =====
   放在样式表最末尾，靠「同特异性、后来者胜」覆盖前面零散的 .14s/.16s 过渡，
   不改前面任何一条规则，避免动一处崩一片。
   设计口径：
     时长分三档（120/200/340ms），手感靠曲线不靠时长；
     位移只用 1px 级别，卡片抬升 1px + 阴影，不做夸张放大；
     所有 focus 用 :focus-visible，鼠标点击不出现焦点环。 */
.dshp-root,.dshp-dock,.dshp-launch,.dshp-auth-mask,.dshp-restart-mask{
	--dshp-t-fast:120ms;
	--dshp-t:200ms;
	--dshp-t-slow:340ms;
	--dshp-t-out:cubic-bezier(.22,1,.36,1);
	--dshp-t-inout:cubic-bezier(.65,0,.35,1);
	--dshp-t-spring:cubic-bezier(.34,1.56,.64,1);
	--dshp-ring:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 55%,transparent);
}
/* 统一过渡：可交互元素只过渡「会变的那几个属性」，不用 transition:all（会带上布局属性） */
.dshp-btn,.dshp-icon-btn,.dshp-hbtn,.dshp-hero-chip-btn,.dshp-tab-btn,
.dshp-dock-tab,.dshp-dock-head button,.dshp-auth-ops button,.dshp-misc-h,
.dshp-misc-sw,.dshp-eng-segb,.dshp-eng-card,.dshp-misc-card,
.dshp-rule-row,.dshp-row,.dshp-switch button,.rt-btn,.rt-tab,.rt-row,.rt-item,.rt-seg{
	transition-property:transform,background-color,border-color,color,box-shadow,opacity;
	transition-duration:var(--dshp-t-fast);
	transition-timing-function:var(--dshp-t-out);
}
/* 按下反馈：1px 下压 + 轻微收缩，能摸到「确实点到了」 */
.dshp-btn:active:not(:disabled),.dshp-icon-btn:active:not(:disabled),
.dshp-hbtn:active:not(:disabled),.dshp-hero-chip-btn:active:not(:disabled),
.dshp-tab-btn:active:not(:disabled),.dshp-dock-tab:active:not(:disabled),
.dshp-dock-head button:active:not(:disabled),.dshp-auth-ops button:active:not(:disabled),
.dshp-misc-h:active:not(:disabled),.dshp-eng-segb:active:not(:disabled),
.dshp-switch button:active:not(:disabled){
	transform:translateY(1px) scale(.985);
	transition-duration:60ms;
}
/* 卡片类：悬停抬 1px 并给阴影，不改变尺寸（避免误触重排） */
.dshp-rule-row:hover,.rt-card:hover{
	transform:translateY(-1px);
	box-shadow:0 4px 14px -6px color-mix(in srgb,#000 42%,transparent);
	border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 34%,var(--dshp-line,rgba(128,128,128,.25)));
}
/* 键盘焦点环：只在键盘导航时出现 */
.dshp-btn:focus-visible,.dshp-icon-btn:focus-visible,.dshp-hbtn:focus-visible,
.dshp-hero-chip-btn:focus-visible,.dshp-tab-btn:focus-visible,.dshp-dock-tab:focus-visible,
.dshp-dock-head button:focus-visible,.dshp-auth-ops button:focus-visible,
.dshp-misc-h:focus-visible,.dshp-misc-sw:focus-visible,.dshp-eng-segb:focus-visible,
.dshp-switch button:focus-visible,.rt-btn:focus-visible,.rt-tab:focus-visible{
	outline:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 80%,transparent);
	outline-offset:2px;
}
.dshp-misc-ctl input:focus-visible,.dshp-field:focus-visible,.dshp-area:focus-visible{
	outline:none;
	border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 70%,transparent);
	box-shadow:var(--dshp-ring);
}
.dshp-misc-ctl input,.dshp-field,.dshp-area{
	transition:border-color var(--dshp-t-fast) var(--dshp-t-out),
	box-shadow var(--dshp-t-fast) var(--dshp-t-out),
	background-color var(--dshp-t-fast) var(--dshp-t-out);
}
/* 开关滑块：回弹曲线 + 按下时滑块变宽（移动端质感） */
.dshp-misc-sw{transition:background-color var(--dshp-t) var(--dshp-t-out),border-color var(--dshp-t) var(--dshp-t-out)}
.dshp-misc-sw::after{transition:transform var(--dshp-t) var(--dshp-t-spring),width var(--dshp-t-fast) var(--dshp-t-out)}
.dshp-misc-sw.on{box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 16%,transparent)}
.dshp-misc-sw:active:not(:disabled)::after{width:19px}
.dshp-misc-sw.on:active:not(:disabled)::after{transform:translateX(10px)}
/* 引擎档位按钮选中态：底色 + 环，过渡更慢一点显得稳 */
.dshp-eng-segb.on{transition-duration:var(--dshp-t)}
/* 正在切换的那一档：不置灰，用脉动提示在提交 */
.dshp-eng-segb.pending{
	border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 50%,transparent);
	background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 10%,transparent);
	animation:dshp-pend-pulse 1.1s var(--dshp-t-inout) infinite;
}
.dshp-eng-segs.pending{display:inline-flex;align-items:center;gap:4px;opacity:.95}
.dshp-eng-segs.pending .dshp-spin{width:9px;height:9px;border-width:1.2px}
@keyframes dshp-pend-pulse{0%,100%{opacity:.75}50%{opacity:1}}
/* 页签下划线：从中间展开 */
.dshp-dock-tab,.dshp-tab-btn{position:relative;border-bottom:2px solid transparent}
.dshp-dock-tab::after,.dshp-tab-btn::after{
	content:"";position:absolute;left:50%;right:50%;bottom:-2px;height:2px;border-radius:2px;
	background:var(--dsw-alias-brand-primary,#6dbf8c);
	transition:left var(--dshp-t) var(--dshp-t-out),right var(--dshp-t) var(--dshp-t-out);
}
.dshp-dock-tab.on::after,.dshp-tab-btn.on::after{left:0;right:0}
.dshp-dock-tab{border-bottom-color:transparent!important}
/* 分组折叠体：用 grid-template-rows 做高度过渡，不需要测高度 */
.dshp-misc-body{display:grid;grid-template-rows:1fr;animation:dshp-expand var(--dshp-t) var(--dshp-t-out) both}
@keyframes dshp-expand{from{opacity:0;grid-template-rows:0fr}to{opacity:1;grid-template-rows:1fr}}
.dshp-misc-body>*{overflow:hidden}
/* 骨架屏：改成扫光，比纯呼吸更像「在加载」 */
.dshp-skel{
	position:relative;overflow:hidden;
	background:color-mix(in srgb,var(--dshp-ink,#888) 12%,transparent);
	animation:none;
}
.dshp-skel::after{
	content:"";position:absolute;inset:0;
	background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--dshp-ink,#fff) 18%,transparent),transparent);
	transform:translateX(-100%);
	animation:dshp-shimmer 1.4s var(--dshp-t-inout) infinite;
}
@keyframes dshp-shimmer{to{transform:translateX(100%)}}
/* 加载指示器 */
.dshp-spin{
	display:inline-block;width:12px;height:12px;flex:none;
	border:1.5px solid color-mix(in srgb,currentColor 30%,transparent);
	border-top-color:currentColor;border-radius:50%;
	animation:dshp-rotate .7s linear infinite;
	vertical-align:-2px;
}
@keyframes dshp-rotate{to{transform:rotate(360deg)}}
/* 操作结果提示：从上方滑入 */
.dshp-misc-note,.dshp-note,.dshp-err{animation:dshp-note-in var(--dshp-t) var(--dshp-t-out) both}
@keyframes dshp-note-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
/* 面板切换：进入时轻微上浮 */
.dshp-dock-body .dshp-root{animation:dshp-pane-in var(--dshp-t) var(--dshp-t-out) both}
@keyframes dshp-pane-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
/* 禁用态统一收光 */
.dshp-btn:disabled,.dshp-icon-btn:disabled,.dshp-hbtn:disabled,
.dshp-dock-tab:disabled,.dshp-eng-segb:disabled,.dshp-misc-h:disabled{
	opacity:.45;cursor:not-allowed;transform:none;
}
/* 尊重系统「减少动态效果」。必须放在本块最后，否则被上面的规则盖掉。 */
@media (prefers-reduced-motion:reduce){
	.dshp-root *,.dshp-dock *,.dshp-launch *{
		animation-duration:.01ms!important;
		animation-iteration-count:1!important;
		transition-duration:.01ms!important;
	transform:none!important;
	box-shadow:none!important;
	}
	.dshp-skel::after{animation:none;background:none}
}


/* ══════════════════════════════════════════════════════════════════════════
   REDESIGN OVERLAY v3 —— 纯样式覆盖层
   ──────────────────────────────────────────────────────────────────────────
   规则：本段只追加在 PURGE_CSS 末尾，靠源顺序覆盖同名旧规则。
   零 JSX 改动、零类名改动、零结构改动 —— 入口与功能不受影响。

   设计方向：暗色工程仪表盘
   · 收敛色相：灰阶为骨，单一强调色（青）点睛，状态色只用在语义处
   · 表面分四层：底 / 卡 / 卡上卡 / 悬浮，靠明度差建立层级
   · 圆角三级 6/10/14，间距 4/8/12/16/24
   · 全部数字等宽（tabular-nums）
   ══════════════════════════════════════════════════════════════════════════ */

/* ── 1. 设计令牌 ── */
.dshp-root{
  --dshp-bg:transparent;
  --dshp-surface:#14171d;
  --dshp-surface-2:#1a1e26;
  --dshp-surface-3:#212733;
  --dshp-overlay:#262d3a;
  --dshp-ink:#dfe5ec;
  --dshp-mute:#8a93a3;
  --dshp-faint:#5a6272;
  --dshp-line:#282f3b;
  --dshp-line-soft:#1f2530;
  --dshp-accent:#35c9b8;
  --dshp-accent-ink:#062420;
  --dshp-accent-soft:rgba(53,201,184,.13);
  --dshp-accent-line:rgba(53,201,184,.35);
  --dshp-ok:#4ade80;
  --dshp-warn:#e8b341;
  --dshp-bad:#f0716e;
  --dshp-r-sm:6px;
  --dshp-r:10px;
  --dshp-r-lg:14px;
  --dshp-r-pill:999px;
  --dshp-ease:cubic-bezier(.25,1,.4,1);
  --dshp-fast:130ms;
  --dshp-med:220ms;
  --dshp-glass:none;
  --dshp-hi:rgba(255,255,255,.04);
  --dshp-paper:var(--dshp-surface);
  --dshp-fill:rgba(53,201,184,.08);
}
.dshp-root[data-theme="white"]{
  color-scheme:light;
  --dshp-surface:#f7f8fa;
  --dshp-surface-2:#ffffff;
  --dshp-surface-3:#eef1f4;
  --dshp-overlay:#ffffff;
  --dshp-ink:#161a20;
  --dshp-mute:#5c6470;
  --dshp-faint:#98a0ac;
  --dshp-line:#dfe3e8;
  --dshp-line-soft:#e9ecf0;
  --dshp-accent:#0e9e8e;
  --dshp-accent-ink:#ffffff;
  --dshp-accent-soft:rgba(14,158,142,.10);
  --dshp-accent-line:rgba(14,158,142,.30);
  --dshp-ok:#1a9e5c;
  --dshp-warn:#b37a10;
  --dshp-bad:#d2504d;
  --dshp-hi:rgba(255,255,255,.65);
}
.dshp-root[data-theme="dusk"]{
  color-scheme:dark;
  --dshp-surface:#1b1822;
  --dshp-surface-2:#221e2b;
  --dshp-surface-3:#2a2534;
  --dshp-overlay:#322c3d;
  --dshp-ink:#e9e4f0;
  --dshp-mute:#9c94ab;
  --dshp-faint:#6b6379;
  --dshp-line:#332d3f;
  --dshp-line-soft:#282333;
  --dshp-accent:#9d8bf5;
  --dshp-accent-ink:#140e24;
  --dshp-accent-soft:rgba(157,139,245,.14);
  --dshp-accent-line:rgba(157,139,245,.38);
  --dshp-ok:#7ee2a8;
  --dshp-warn:#eec26a;
  --dshp-bad:#f28f8c;
  --dshp-fill:rgba(157,139,245,.09);
}

/* ── 2. 容器与面板 ── */
.dshp-root{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  max-width:100%;
  gap:12px;
}
.dshp-panel,.dshp-group,.dshp-metric,.dshp-ask,.dshp-modal,.dshp-rulelist,.dshp-active,.dshp-editor,.dshp-create,.dshp-switch,.dshp-eng-card,.dshp-misc-card,.dshp-restart-card{
  border:1px solid var(--dshp-line);
  background:var(--dshp-surface-2);
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
  box-shadow:none !important;
  border-radius:10px;
}
.dshp-panel{border-radius:14px;padding:18px}
.dshp-root em,.dshp-dock em{font-style:normal}

/* ── 3. 排版 ── */
.dshp-kicker{
  font:600 10px/14px ui-monospace,Menlo,monospace;
  letter-spacing:.18em;
  text-transform:uppercase;
  color:var(--dshp-accent);
  margin:0 0 6px;
}
.dshp-title{
  font-size:19px;font-weight:650;line-height:28px;letter-spacing:-.015em;
  margin:0;color:var(--dshp-ink);
}
.dshp-head{gap:10px;margin-bottom:14px;align-items:flex-start}
.dshp-sub{
  margin:22px 0 10px;
  padding-bottom:8px;
  border-bottom:1px solid var(--dshp-line-soft);
}
.dshp-sub h4{font-size:14px;font-weight:650;letter-spacing:.01em}
.dshp-hint,.dshp-mute{color:var(--dshp-mute)}
.dshp-mono,.dshp-ver,.dshp-count,.dshp-id,.dshp-now-ver,.dshp-eng-bytes,.dshp-eng-bytes *{
  font-family:ui-monospace,Menlo,"Cascadia Mono",monospace;
  font-variant-numeric:tabular-nums;
}

/* ── 4. 指标卡 ── */
.dshp-metrics{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
.dshp-metric{
  padding:13px 14px;
  min-height:76px;
  gap:5px;
  border-radius:10px;
  transition:border-color var(--dshp-fast) var(--dshp-ease),background var(--dshp-fast) var(--dshp-ease);
}
.dshp-metric:hover{border-color:var(--dshp-accent-line);background:var(--dshp-surface-3)}
.dshp-metric b{font-size:21px;font-weight:650;line-height:28px;letter-spacing:-.02em;color:var(--dshp-ink);font-variant-numeric:tabular-nums}
.dshp-metric span{font-size:11px;line-height:15px;color:var(--dshp-mute);letter-spacing:.02em}

/* ── 5. 按钮 ── */
.dshp-btn,.rt-btn{
  appearance:none;
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  height:32px;padding:0 14px;
  border:1px solid var(--dshp-line);
  border-radius:8px;
  background:var(--dshp-surface-3);
  color:var(--dshp-ink);
  font:500 12.5px/1 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",system-ui,sans-serif;
  letter-spacing:.01em;
  cursor:pointer;white-space:nowrap;
  box-shadow:none;
  transition:background var(--dshp-fast) var(--dshp-ease),border-color var(--dshp-fast) var(--dshp-ease),color var(--dshp-fast) var(--dshp-ease),transform var(--dshp-fast) var(--dshp-ease);
}
.dshp-btn:hover:not(:disabled),.rt-btn:hover:not(:disabled){
  background:var(--dshp-surface-3);
  border-color:var(--dshp-accent-line);
  color:var(--dshp-ink);
  transform:none;
}
.dshp-btn:active:not(:disabled){transform:translateY(1px)}
.dshp-btn:focus-visible,.rt-btn:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:2px}
.dshp-btn:disabled{opacity:.4;cursor:not-allowed}
.dshp-btn-primary,.rt-btn-primary{
  background:var(--dshp-accent) !important;
  border-color:var(--dshp-accent) !important;
  color:var(--dshp-accent-ink) !important;
  font-weight:600;
}
.dshp-btn-primary:hover:not(:disabled),.rt-btn-primary:hover:not(:disabled){
  background:var(--dshp-accent) !important;
  border-color:var(--dshp-accent) !important;
  filter:brightness(1.08);
}
.dshp-btn-danger,.dshp-btn-solid-danger{
  color:var(--dshp-bad);
  border-color:color-mix(in srgb,var(--dshp-bad) 35%,var(--dshp-line));
  background:transparent;
}
.dshp-btn-danger:hover:not(:disabled),.dshp-btn-solid-danger:hover:not(:disabled){
  background:color-mix(in srgb,var(--dshp-bad) 12%,transparent);
  border-color:var(--dshp-bad);
}
.dshp-btn-ghost{background:transparent;border-color:transparent;color:var(--dshp-mute)}
.dshp-btn-ghost:hover:not(:disabled){background:var(--dshp-fill);border-color:transparent;color:var(--dshp-ink)}
.dshp-btn-tiny,.dshp-btn-mini,.dshp-hbtn{height:26px;padding:0 10px;font-size:11.5px}

/* ── 6. 输入 ── */
.dshp-input,.rt-input,.dshp-area,.rt-textarea,.dshp-misc-ta,.dshp-editor{
  background:var(--dshp-surface);
  border:1px solid var(--dshp-line);
  border-radius:8px;
  color:var(--dshp-ink);
  font-size:12.5px;
  box-shadow:none;
  transition:border-color var(--dshp-fast) var(--dshp-ease),box-shadow var(--dshp-fast) var(--dshp-ease);
}
.dshp-input,.rt-input{height:32px;padding:0 11px}
.dshp-input::placeholder,.rt-input::placeholder{color:var(--dshp-faint)}
.dshp-input:hover,.rt-input:hover{border-color:color-mix(in srgb,var(--dshp-accent) 30%,var(--dshp-line))}
.dshp-input:focus,.rt-input:focus,.dshp-area:focus,.rt-textarea:focus,.dshp-editor:focus,.dshp-misc-ta:focus{
  outline:none;
  border-color:var(--dshp-accent);
  box-shadow:0 0 0 3px var(--dshp-accent-soft);
}

/* ── 7. 胶囊与状态 ── */
.dshp-pill,.rt-tag{
  display:inline-flex;align-items:center;gap:5px;
  font:500 10.5px/16px ui-monospace,Menlo,monospace;
  letter-spacing:.03em;
  padding:2px 9px;
  border:1px solid var(--dshp-line);
  border-radius:999px;
  background:var(--dshp-surface-3);
  color:var(--dshp-mute);
}
.dshp-pill::before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor;flex:0 0 auto}
.dshp-pill.is-ok{color:var(--dshp-ok);border-color:color-mix(in srgb,var(--dshp-ok) 32%,var(--dshp-line));background:color-mix(in srgb,var(--dshp-ok) 10%,transparent)}
.dshp-pill.is-wait{color:var(--dshp-warn);border-color:color-mix(in srgb,var(--dshp-warn) 32%,var(--dshp-line));background:color-mix(in srgb,var(--dshp-warn) 10%,transparent)}
.dshp-pill.is-bad,.dshp-pill.is-miss{color:var(--dshp-bad);border-color:color-mix(in srgb,var(--dshp-bad) 32%,var(--dshp-line));background:color-mix(in srgb,var(--dshp-bad) 10%,transparent)}
.dshp-pill.is-cur{color:var(--dshp-accent);border-color:var(--dshp-accent-line);background:var(--dshp-accent-soft)}
.dshp-count{
  font-size:10.5px;
  padding:1px 8px;
  border-radius:999px;
  background:var(--dshp-surface-3);
  color:var(--dshp-mute);
}

/* ── 8. 分段开关 ── */
.dshp-switch{padding:3px;gap:2px;background:var(--dshp-surface);border-radius:8px}
.dshp-switch button{
  border:0;border-radius:6px;
  background:transparent;
  color:var(--dshp-mute);
  font:500 12px/1 -apple-system,"PingFang SC",system-ui,sans-serif;
  padding:6px 12px;
}
.dshp-switch button:hover{color:var(--dshp-ink);background:var(--dshp-surface-3)}
.dshp-switch button.is-on{background:var(--dshp-accent);color:var(--dshp-accent-ink);font-weight:600}

/* ── 9. 表格 ── */
.dshp-table,.rt-table{font-size:12px;line-height:18px}
.dshp-table th,.rt-table th{
  font:500 10px/16px ui-monospace,Menlo,monospace;
  letter-spacing:.1em;text-transform:uppercase;
  color:var(--dshp-faint);
  padding:7px 12px;
  border-bottom:1px solid var(--dshp-line);
  background:var(--dshp-surface);
}
.dshp-table td,.rt-table td{padding:8px 12px;border-bottom:1px solid var(--dshp-line-soft)}
.dshp-table tbody tr,.rt-table tbody tr{transition:background var(--dshp-fast) var(--dshp-ease)}
.dshp-table tbody tr:hover,.rt-table tbody tr:hover{background:var(--dshp-fill)}
.dshp-table tr.is-on td{background:var(--dshp-accent-soft)}

/* ── 10. 折叠组与规则行 ── */
.dshp-group{overflow:hidden;margin-bottom:8px}
.dshp-group-h{padding:9px 13px;gap:10px}
.dshp-group-h:hover{background:var(--dshp-fill)}
.dshp-group-h strong{font-size:13px;font-weight:600}
.dshp-group-h em{font-size:11px;color:var(--dshp-mute)}
.dshp-rule-row,.dshp-ruleitem,.dshp-misc-row,.dshp-cwd-item,.dshp-eng-prow{
  transition:background var(--dshp-fast) var(--dshp-ease);
  border-radius:8px;
}
.dshp-rule-row:hover,.dshp-ruleitem:hover,.dshp-misc-row:hover,.dshp-cwd-item:hover,.dshp-eng-prow:hover{background:var(--dshp-fill)}

/* ── 11. 流程图 ── */
.dshp-flow{margin-bottom:14px}
.dshp-flow-kind{font:600 10px/16px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:var(--dshp-faint)}
.dshp-flow-node b{
  width:22px;height:22px;
  border:1px solid var(--dshp-line);
  background:var(--dshp-surface-3);
  font:600 10.5px/1 ui-monospace,Menlo,monospace;
}
.dshp-flow-node em{font-size:11px;color:var(--dshp-mute)}
.dshp-flow-node.is-cur b{border-color:var(--dshp-accent);background:var(--dshp-accent-soft);color:var(--dshp-accent);box-shadow:0 0 0 3px var(--dshp-accent-soft)}
.dshp-flow-node.is-done b{border-color:color-mix(in srgb,var(--dshp-ok) 45%,var(--dshp-line));background:color-mix(in srgb,var(--dshp-ok) 12%,transparent);color:var(--dshp-ok)}
.dshp-flow-node.is-bad b{border-color:var(--dshp-bad);background:color-mix(in srgb,var(--dshp-bad) 12%,transparent);color:var(--dshp-bad)}
.dshp-flow-wire{height:2px;background:var(--dshp-line);border-radius:2px}
.dshp-flow-wire.is-on{background:color-mix(in srgb,var(--dshp-accent) 55%,var(--dshp-line))}
.dshp-flow-wire.is-on>i{background:var(--dshp-accent)}

/* ── 12. 进度条 ── */
.dshp-bar{height:3px;background:var(--dshp-line-soft);border-radius:999px;margin:10px 0 14px}
.dshp-bar>i{background:linear-gradient(90deg,var(--dshp-accent),color-mix(in srgb,var(--dshp-accent) 55%,#fff))}

/* ── 13. 版本区块 ── */
.dshp-now{gap:8px}
.dshp-now-ver{font-size:20px;font-weight:650;color:var(--dshp-ink);letter-spacing:-.02em}
.dshp-now-label,.dshp-now-mark{font-size:11px;color:var(--dshp-mute)}
.dshp-edition{border-radius:10px;padding:12px 14px;border:1px solid var(--dshp-line);background:var(--dshp-surface-3)}
.dshp-edition-name{font-size:13px;font-weight:600}

/* ── 14. 弹窗 ── */
.dshp-modal-bg,.dshp-cap-mask,.dshp-auth-mask,.dshp-restart-mask{
  background:rgba(6,8,12,.62) !important;
  backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
}
.dshp-modal,.dshp-cap-modal,.dshp-auth-modal,.dshp-restart-card{
  border-radius:14px;
  border:1px solid var(--dshp-line);
  background:var(--dshp-overlay);
  box-shadow:0 16px 48px rgba(0,0,0,.5) !important;
}
.dshp-modal h4,.dshp-cap-mtitle{font-size:15px;font-weight:650}

/* ── 15. 引擎页细节 ── */
.dshp-eng-card{padding:14px;border-radius:12px}
.dshp-eng-head{margin-bottom:10px}
.dshp-eng-name{font-size:13px;font-weight:600}
.dshp-eng-tag,.dshp-eng-flag,.dshp-eng-tier{
  font:500 10px/18px ui-monospace,Menlo,monospace;
  padding:1px 8px;border-radius:999px;
  background:var(--dshp-surface-3);color:var(--dshp-mute);
}
.dshp-eng-on .dshp-eng-tag{background:var(--dshp-accent-soft);color:var(--dshp-accent)}
.dshp-eng-opt,.dshp-eng-prow{padding:6px 8px}
.dshp-eng-segn{font-size:12px}
.dshp-eng-sum,.dshp-eng-report{font-size:11.5px;color:var(--dshp-mute)}

/* ── 16. 其他区块 ── */
.dshp-misc-card{padding:12px 14px;border-radius:10px}
.dshp-misc-h{font-size:13px;font-weight:600}
.dshp-misc-lbl{font-size:11.5px;color:var(--dshp-mute)}
.dshp-misc-note{border-radius:6px;font-size:11.5px}
.dshp-armor-head{margin-bottom:10px}
.dshp-armor-title{font-size:14px;font-weight:650}
.dshp-armor-row{border-radius:8px;padding:7px 9px}
.dshp-rule-name,.dshp-cwd-name{font-weight:600}
.dshp-empty,.rt-empty,.dshp-editor-empty{color:var(--dshp-faint);font-size:12px}
.dshp-skel{background:var(--dshp-line-soft);border-radius:6px}
.dshp-spin,.dshp-live-dot{color:var(--dshp-accent)}
.dshp-notice,.dshp-note{border-radius:8px;font-size:12px}
.dshp-hero-chip{border-radius:999px;border:1px solid var(--dshp-line);background:var(--dshp-surface-2)}
.dshp-hero-chip-btn{border-radius:999px;font-size:12px}
.dshp-tab-btn,.dshp-tab-chip{border-radius:8px;font-size:12px}
.dshp-cwd-list{border-radius:10px}
.dshp-block{border-radius:10px}
.dshp-err,.rt-err{color:var(--dshp-bad);border-radius:8px}

/* ── 17. rt- 系列（hacker 面板沿用令牌）── */
.rt-card{border:1px solid var(--dshp-line);border-radius:10px;background:var(--dshp-surface-2)}
.rt-title{font-size:16px;font-weight:650;letter-spacing:-.01em}
.rt-head,.rt-toolbar,.rt-foot{padding:9px 12px}
.rt-tab{
  border-radius:8px 8px 0 0;
  font-size:12.5px;
  color:var(--dshp-mute);
  padding:7px 13px;
  border-bottom:2px solid transparent;
  transition:color var(--dshp-fast) var(--dshp-ease),background var(--dshp-fast) var(--dshp-ease);
}
.rt-tab:hover{color:var(--dshp-ink);background:var(--dshp-fill)}
.rt-item{border-radius:8px;transition:background var(--dshp-fast) var(--dshp-ease)}
.rt-item:hover{background:var(--dshp-fill)}
.rt-item-name{font-size:13px;font-weight:600}
.rt-item-desc,.rt-hint,.rt-note{color:var(--dshp-mute);font-size:11.5px}
.rt-code,.rt-mono,.rt-kv{font-family:ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}

/* ── 18. 交互统一 ── */
.dshp-root :focus-visible{outline:2px solid var(--dshp-accent);outline-offset:2px}
.dshp-root ::-webkit-scrollbar{width:9px;height:9px}
.dshp-root ::-webkit-scrollbar-track{background:transparent}
.dshp-root ::-webkit-scrollbar-thumb{
  background:var(--dshp-line);
  border-radius:999px;
  border:2px solid transparent;
  background-clip:padding-box;
}
.dshp-root ::-webkit-scrollbar-thumb:hover{background:var(--dshp-faint);background-clip:padding-box}
.dshp-root ::selection{background:var(--dshp-accent-soft);color:var(--dshp-ink)}
.dshp-row{gap:8px}
.dshp-row+.dshp-row{margin-top:12px}
.dshp-toolbar{gap:8px}



/* ══ 排版 v2：panebar 工具行 + sticky 页签（不改配色，只改布局）══ */
.dshp-panebar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:8px 10px;border:1px solid var(--dshp-line);border-radius:10px;background:var(--dshp-fill)}
.dshp-panebar .dshp-switch{background:transparent;border-color:var(--dshp-line)}
.dshp-panebar .dshp-row{gap:6px}
.dshp-panebar .dshp-btn{min-width:0}
.dshp-panebar .dshp-btn[disabled]{opacity:.45}
.dshp-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.dshp-metric{min-height:56px;padding:10px 12px}
.dshp-dock-body .dshp-panebar{padding:6px 8px;margin-bottom:10px}
.dshp-dock-body .dshp-area{min-height:180px}
@media (max-width:520px){.dshp-panebar{flex-direction:column;align-items:stretch}.dshp-panebar .dshp-row{margin-left:0!important;justify-content:flex-end}}
/* ══ 首次弹窗：自检触发词展示区 ══ */
.dshp-trigger-box{display:flex;flex-direction:column;align-items:center;gap:8px;margin:12px 0;padding:16px 14px;border:1px solid var(--dshp-line);border-radius:10px;background:var(--dshp-fill)}
.dshp-trigger-word{font-family:var(--dshp-mono);font-size:22px;font-weight:600;letter-spacing:.08em;color:var(--dshp-accent);padding:6px 18px;border:1px dashed var(--dshp-line);border-radius:8px;background:var(--dshp-paper)}
.dshp-trigger-arrow{font-size:14px;line-height:1;color:var(--dshp-mute);opacity:.6}
.dshp-trigger-reply{font-family:var(--dshp-sans);font-size:13px;line-height:1.6;text-align:center;color:var(--dshp-ink);padding:8px 12px;border-radius:8px;background:var(--dshp-paper);border:1px solid var(--dshp-line);word-break:break-word}
.dshp-trigger-note{margin:0;font-size:12px;line-height:1.6;color:var(--dshp-mute)}

/* ══ 首次弹窗：按钮倒计时提示 ══ */
.dshp-auth-count{display:inline-flex;align-items:center;gap:6px;font-family:var(--dshp-mono);font-size:12px;line-height:1;color:var(--dshp-mute);padding:6px 10px;border-radius:6px;background:var(--dshp-fill);white-space:nowrap}
.dshp-auth-count::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--dshp-accent);animation:dshp-count-pulse 1s ease-in-out infinite}
@keyframes dshp-count-pulse{0%,100%{opacity:.35}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.dshp-auth-count::before{animation:none;opacity:.7}}
.dshp-auth-ops .primary[disabled]{cursor:not-allowed}

/* ══ 概览页：仓库卡片 ══ */
.dshp-repo{margin:14px 0 0;padding:14px 16px;border:1px solid var(--dshp-line);border-radius:var(--dshp-r,10px);background:var(--dshp-card)}
.dshp-repo-head{display:flex;align-items:center;gap:10px;margin:0 0 10px}
.dshp-repo-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:0 0 auto;border-radius:8px;background:var(--dshp-accent-soft);color:var(--dshp-accent);font-size:15px;line-height:1}
.dshp-repo-title{display:flex;flex-direction:column;gap:1px;min-width:0}
.dshp-repo-title b{font:600 14px/18px var(--dshp-sans);color:var(--dshp-ink)}
.dshp-repo-title em{font:500 11px/14px var(--dshp-mono);font-style:normal;letter-spacing:.04em;color:var(--dshp-faint)}
.dshp-repo-ask{margin:0 0 8px;font:400 12.5px/1.65 var(--dshp-sans);color:var(--dshp-ink)}
.dshp-repo-note{margin:0 0 12px;font:400 12px/1.6 var(--dshp-sans);color:var(--dshp-mute)}
.dshp-repo-fb{margin:0 0 12px;padding:10px 12px;border:1px solid var(--dshp-line);border-left:3px solid var(--dshp-accent);border-radius:8px;background:var(--dshp-fill)}
.dshp-repo-fb-title{display:block;margin:0 0 4px;font:600 12.5px/1.5 var(--dshp-sans);color:var(--dshp-ink)}
.dshp-repo-fb-body{margin:0;font:400 12px/1.7 var(--dshp-sans);color:var(--dshp-mute)}
.dshp-repo-ops{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.dshp-repo-openmsg{margin:0 0 10px;padding:7px 10px;border-radius:8px;background:var(--dshp-accent-soft);font:400 11.5px/1.6 var(--dshp-sans);color:var(--dshp-ink)}
.dshp-repo-btn{text-decoration:none;height:30px;padding:0 13px;font-size:12.5px}
.dshp-repo-link{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--dshp-line-soft)}
.dshp-repo-linklabel{font:400 11.5px/1.5 var(--dshp-sans);color:var(--dshp-faint)}
.dshp-repo-url{flex:1 1 auto;min-width:0;padding:5px 9px;border:1px dashed var(--dshp-line);border-radius:6px;background:var(--dshp-paper);font:500 11.5px/1.5 var(--dshp-mono);color:var(--dshp-accent);cursor:pointer;word-break:break-all;user-select:all}
.dshp-repo-url:hover{background:var(--dshp-fill)}
@media (max-width:520px){.dshp-repo{padding:12px}.dshp-repo-ops{flex-direction:column}.dshp-repo-btn{width:100%;justify-content:center}}

/* ══ 消息层清洗强度（配色对齐引擎切换按钮）══ */
.dshp-clean{margin:10px 0 0}
.dshp-clean-head{display:flex;align-items:center;gap:8px;margin:0 0 6px}
.dshp-clean-title{font:600 12px/1.4 var(--dshp-sans);color:var(--dshp-ink)}
.dshp-clean-badge{padding:1px 7px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 22%,transparent);color:var(--dsw-alias-brand-primary,#6dbf8c);font:600 10px/15px var(--dshp-sans);letter-spacing:.03em}
.dshp-clean-lead{margin:0 0 8px;font:400 11.5px/1.6 var(--dshp-sans);color:var(--dshp-mute)}
.dshp-clean-opts{display:flex;gap:6px;padding:5px;border:1px solid var(--dshp-line,rgba(128,128,128,.22));border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-secondary,transparent) 42%,transparent)}
.dshp-clean-opt{flex:1 1 0;display:flex;flex-direction:column;gap:3px;padding:9px 11px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background .14s,border-color .14s,box-shadow .14s;min-width:0}
.dshp-clean-opt:hover:not(.on):not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 10%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 26%,transparent)}
.dshp-clean-opt.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 18%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 62%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#6dbf8c) 28%,transparent);cursor:default}
.dshp-clean-opt:disabled{opacity:.55;cursor:not-allowed}
.dshp-clean-n{font-size:12.5px;line-height:1.3;font-weight:600;color:inherit}
.dshp-clean-d{font-size:11px;line-height:1.5;opacity:.72}
.dshp-clean-warn{margin:8px 0 0;padding:8px 11px;border-left:2px solid color-mix(in srgb,#e0a53b 70%,transparent);border-radius:0 6px 6px 0;background:color-mix(in srgb,#e0a53b 8%,transparent);font:400 11.5px/1.6 var(--dshp-sans);color:var(--dshp-ink)}
@media (max-width:520px){.dshp-clean-opts{flex-direction:column}.dshp-clean-n{font-size:12px}}
/* ══ 跑分页 ══ */
.dshp-bench{padding:2px 0 0}
.dshp-bench-lead{margin:2px 0 16px;font:400 12.5px/1.65 var(--dshp-sans);color:var(--dshp-mute)}
.dshp-bench-form{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 16px}
.dshp-bench-f{display:flex;flex-direction:column;gap:5px;min-width:0}
.dshp-bench-f>span{font:600 11.5px/1.4 var(--dshp-sans);color:var(--dshp-ink);letter-spacing:.02em}
.dshp-bench-f>input,.dshp-bench-f>select{height:32px;padding:0 10px;border:1px solid var(--dshp-line);border-radius:7px;background:var(--dshp-paper);color:var(--dshp-ink);font:400 12.5px/1 var(--dshp-mono);outline:none;transition:border-color .18s}
.dshp-bench-f>input:focus,.dshp-bench-f>select:focus{border-color:var(--dshp-accent)}
.dshp-bench-f>input:disabled,.dshp-bench-f>select:disabled{opacity:.55;cursor:not-allowed}
.dshp-bench-f>em{font:400 11px/1.5 var(--dshp-sans);color:var(--dshp-faint);font-style:normal}
.dshp-bench-chk{grid-column:1/-1;display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid var(--dshp-line);border-radius:8px;background:var(--dshp-paper);cursor:pointer}
.dshp-bench-chk>input{margin-top:2px;flex:0 0 auto}
.dshp-bench-chk>span{font:600 12px/1.4 var(--dshp-sans);color:var(--dshp-ink)}
.dshp-bench-chk>em{font:400 11px/1.5 var(--dshp-sans);color:var(--dshp-faint);font-style:normal}
.dshp-bench-ops{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
.dshp-bench-err{margin:0 0 12px;padding:9px 12px;border-left:2px solid var(--dshp-danger,#d9534f);border-radius:0 6px 6px 0;background:color-mix(in srgb,var(--dshp-danger,#d9534f) 8%,transparent);font:400 12px/1.6 var(--dshp-sans);color:var(--dshp-ink)}
.dshp-bench-note{margin:0 0 12px;padding:9px 12px;border-left:2px solid var(--dshp-accent);border-radius:0 6px 6px 0;background:var(--dshp-accent-soft);font:400 12px/1.6 var(--dshp-sans);color:var(--dshp-ink)}
.dshp-bench-live{margin:0 0 16px;padding:14px 16px;border:1px solid var(--dshp-line);border-radius:10px;background:var(--dshp-paper)}
.dshp-bench-bar{position:relative;height:22px;border-radius:6px;background:var(--dshp-fill);overflow:hidden;margin:0 0 12px}
.dshp-bench-bar>i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--dshp-accent),#7fd09c);transition:width .3s var(--dshp-t,ease)}
.dshp-bench-bar>span{position:relative;display:flex;align-items:center;justify-content:center;height:100%;font:600 11px/1 var(--dshp-mono);color:var(--dshp-ink);text-shadow:0 1px 2px rgba(0,0,0,.35)}
.dshp-bench-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--dshp-line);border-radius:8px;overflow:hidden}
.dshp-bench-stats>div{background:var(--dshp-panel);padding:12px 10px;text-align:center}
.dshp-bench-stats b{display:block;font:700 20px/1.1 var(--dshp-mono);color:var(--dshp-accent);margin-bottom:4px}
.dshp-bench-stats span{font:400 11px/1.3 var(--dshp-sans);color:var(--dshp-faint)}
.dshp-bench-rows{display:grid;gap:1px;background:var(--dshp-line);border:1px solid var(--dshp-line);border-radius:8px;overflow:hidden;margin:0 0 16px;max-height:320px;overflow-y:auto}
.dshp-bench-row{display:grid;grid-template-columns:1fr 46px 76px 52px;gap:10px;align-items:center;padding:9px 13px;background:var(--dshp-panel);font:400 12px/1.4 var(--dshp-sans)}
.dshp-bench-rn{color:var(--dshp-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-bench-rs{font:700 13px/1 var(--dshp-mono);text-align:right}
.dshp-bench-rs.is-full{color:var(--dshp-accent)}
.dshp-bench-rs.is-ok{color:#7fd09c}
.dshp-bench-rs.is-mid{color:var(--dshp-warn,#e0a53b)}
.dshp-bench-rs.is-low{color:var(--dshp-danger,#d9534f)}
.dshp-bench-rl{font:400 11px/1.3 var(--dshp-sans);color:var(--dshp-mute)}
.dshp-bench-rt{font:400 11px/1.3 var(--dshp-mono);color:var(--dshp-faint);text-align:right}
.dshp-bench-logs{display:grid;gap:8px}
.dshp-bench-log{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:11px 13px;border:1px solid var(--dshp-line);border-radius:9px;background:var(--dshp-paper);transition:border-color .2s}
.dshp-bench-log.is-on{border-color:var(--dshp-accent);background:var(--dshp-accent-soft)}
.dshp-bench-lgi{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 200px}
.dshp-bench-lgi b{font:600 12px/1.4 var(--dshp-mono);color:var(--dshp-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-bench-lgi em{font:400 11px/1.4 var(--dshp-sans);color:var(--dshp-faint);font-style:normal}
.dshp-bench-lgo{display:flex;flex-wrap:wrap;gap:6px}
.dshp-bench-lgo .dshp-btn{height:26px;padding:0 10px;font-size:11.5px}
.dshp-btn.is-danger{border-color:color-mix(in srgb,var(--dshp-danger,#d9534f) 45%,transparent);color:var(--dshp-danger,#d9534f)}
.dshp-btn.is-danger:hover{background:color-mix(in srgb,var(--dshp-danger,#d9534f) 12%,transparent)}
.dshp-bench-empty{margin:0;padding:14px;text-align:center;font:400 12px/1.6 var(--dshp-sans);color:var(--dshp-faint);border:1px dashed var(--dshp-line);border-radius:9px}
@media (max-width:560px){.dshp-bench-form{grid-template-columns:1fr}.dshp-bench-row{grid-template-columns:1fr 40px 60px}.dshp-bench-rt{display:none}}
/* ── 跑分：模型行 / 批量对比 ── */
.dshp-bench-mrow{display:flex;gap:6px}
.dshp-bench-mrow>input{flex:1 1 auto;min-width:0}
.dshp-bench-mrow>button{flex:0 0 auto;height:32px;padding:0 12px;font-size:12px}
.dshp-bench-batch{margin:20px 0 0;padding:14px 16px;border:1px solid var(--dshp-line);border-radius:10px;background:var(--dshp-paper)}
.dshp-bench-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.dshp-bench-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 5px 3px 9px;border:1px solid var(--dshp-line);border-radius:999px;background:var(--dshp-panel);font:500 11.5px/1.5 var(--dshp-mono);color:var(--dshp-ink)}
.dshp-bench-chip>i{cursor:pointer;padding:0 4px;font-style:normal;color:var(--dshp-faint);border-radius:50%;transition:color .16s,background .16s}
.dshp-bench-chip>i:hover{color:var(--dshp-danger,#d9534f);background:color-mix(in srgb,var(--dshp-danger,#d9534f) 12%,transparent)}
.dshp-bench-matrix{border:1px solid var(--dshp-line);border-radius:8px;overflow:hidden}
.dshp-bench-mhead,.dshp-bench-mrow{display:grid;grid-template-columns:1fr 60px 64px 64px;gap:10px;align-items:center;padding:9px 13px;font:400 12px/1.4 var(--dshp-sans)}
.dshp-bench-mhead{background:var(--dshp-panel);font-weight:600;font-size:11px;letter-spacing:.04em;color:var(--dshp-mute);text-transform:uppercase}
.dshp-bench-mrow{border-top:1px solid var(--dshp-line);background:var(--dshp-panel)}
.dshp-bench-mrow:hover{background:var(--dshp-fill)}
.dshp-bench-mname{font:500 12px/1.4 var(--dshp-mono);color:var(--dshp-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:560px){.dshp-bench-mhead,.dshp-bench-mrow{grid-template-columns:1fr 48px 52px}.dshp-bench-mhead>span:last-child,.dshp-bench-mrow>span:last-child{display:none}}
/* 拉取按钮：独立一行，右对齐，不占输入框宽度 */
.dshp-bench-pull{align-self:flex-end;height:28px;padding:0 14px;border:1px solid var(--dshp-line);border-radius:7px;background:var(--dshp-paper);color:var(--dshp-accent);font:500 11.5px/1 var(--dshp-sans);cursor:pointer;transition:all .2s var(--dshp-t,ease)}
.dshp-bench-pull:hover:not(:disabled){border-color:var(--dshp-accent);background:var(--dshp-accent-soft)}
.dshp-bench-pull:disabled{opacity:.5;cursor:not-allowed}
.dshp-bench-f>input+.dshp-bench-pull{margin-top:2px}
/* 旧的 mrow 规则保留但不再使用，避免残留引用报错 */
.dshp-bench-mrow{display:flex;gap:6px}
/* 补丁诊断状态色：绿=可打≥80% / 黄=50-80% / 红=<50% */
.dshp-diag-ok{color:var(--dshp-accent)!important}
.dshp-diag-mid{color:var(--dshp-warn,#e0a53b)!important}
.dshp-diag-low{color:var(--dshp-danger,#d9534f)!important}
/* 版本级别：exact 绿 / minor 黄 / unknown 红 */
.dshp-lv-exact{color:var(--dshp-accent)!important}
.dshp-lv-minor{color:var(--dshp-warn,#e0a53b)!important}
.dshp-lv-unknown{color:var(--dshp-danger,#d9534f)!important}
/* ── 宿主状态卡片 ─────────────────────────────────────────────────────── */
.dshp-hostcard{margin:10px 0 4px;padding:11px 13px;border:1px solid var(--dshp-line);
  border-radius:10px;background:var(--dshp-panel2);display:flex;flex-direction:column;gap:8px}
.dshp-hc-row{display:flex;align-items:center;gap:9px;min-height:20px;flex-wrap:wrap}
.dshp-hc-label{font-size:11px;letter-spacing:.05em;text-transform:uppercase;
  color:var(--dshp-mute);flex-shrink:0;min-width:56px}
.dshp-hc-label.is-bad{color:var(--dshp-bad);font-weight:700}
.dshp-hc-ver{font:600 12.5px/1 var(--dshp-mono);color:var(--dshp-ink);
  background:var(--dshp-panel);padding:3px 8px;border-radius:5px;border:1px solid var(--dshp-line)}
.dshp-hc-badge{font-size:11px;padding:2px 8px;border-radius:20px;border:1px solid;font-weight:600}
.dshp-hc-badge.is-ok{color:var(--dshp-good);border-color:rgba(109,191,140,.45);background:rgba(109,191,140,.12)}
.dshp-hc-badge.is-warn{color:var(--dshp-warn);border-color:rgba(224,165,59,.45);background:rgba(224,165,59,.12)}
.dshp-hc-badge.is-bad{color:var(--dshp-bad);border-color:rgba(217,83,79,.45);background:rgba(217,83,79,.12)}
.dshp-hc-badge.is-mute{color:var(--dshp-mute);border-color:var(--dshp-line);background:transparent}
.dshp-hc-bar{flex:1;min-width:90px;height:5px;border-radius:3px;background:var(--dshp-line);overflow:hidden}
.dshp-hc-bar > i{display:block;height:100%;background:var(--dshp-good);transition:width .4s var(--dshp-ease)}
.dshp-hc-num{font:600 11.5px/1 var(--dshp-mono);color:var(--dshp-ink);flex-shrink:0}
.dshp-hc-note{font-size:11px;padding:1px 6px;border-radius:4px}
.dshp-hc-note.is-warn{color:var(--dshp-warn);background:rgba(224,165,59,.12)}
.dshp-hc-engines{display:flex;gap:5px;flex-wrap:wrap}
.dshp-hc-eng{font-size:11px;padding:3px 8px;border-radius:5px;border:1px solid var(--dshp-line);
  color:var(--dshp-mute);background:var(--dshp-panel)}
.dshp-hc-eng.is-on{color:var(--dshp-good);border-color:rgba(109,191,140,.5);background:rgba(109,191,140,.12);font-weight:600}
.dshp-hc-eng.is-on-deg{color:var(--dshp-warn);border-color:rgba(224,165,59,.5);background:rgba(224,165,59,.12);font-weight:600}
.dshp-hc-eng.is-on-bad{color:var(--dshp-bad);border-color:rgba(217,83,79,.5);background:rgba(217,83,79,.12);font-weight:600}
.dshp-hc-why{align-items:flex-start}
.dshp-hc-reason{font-size:11.5px;line-height:1.55;color:var(--dshp-mute);flex:1;min-width:0}
`;

		function formatSize(bytes) {
			if (typeof bytes !== "number" || !isFinite(bytes) || bytes < 0) return "0 B";
			if (bytes < 1024) return bytes + " B";
			const kb = bytes / 1024;
			return (kb >= 100 ? Math.round(kb) : kb.toFixed(1)) + " KB";
		}

		function statusKind(st) {
			if (st === "applied" || st === "already") return "ok";
			if (st === "pending") return "wait";
			if (st === "unmatched") return "bad";
			if (st === "drifted") return "bad";
			if (st === "na") return "ok";
			if (st === "missing_file" || st === "skipped" || st === "unlocated" || st === "off") return "miss";
			return "bad";
		}

		function statusLabel(st, t) {
			if (st === "applied" || st === "already") return t("status.applied");
			if (st === "off") return t("status.skipped");
			if (st === "pending") return t("status.pending");
			if (st === "unmatched") return t("status.unmatched");
			if (st === "drifted") return t("status.drifted");
			if (st === "skipped") return t("status.skipped");
			if (st === "missing_file") return t("skip");
			if (st === "unlocated") return t("status.unlocated");
			if (st === "na") return t("status.na");
			return st || t("unknown");
		}

		function shimKind(v) {
			if (v === "patched" || v === "n/a") return "ok";
			if (v === "original") return "wait";
			if (v === "missing" || !v) return "miss";
			return "bad";
		}

		function noticeNode(notice) {
			if (!notice || notice.kind === "idle" || !notice.text) return null;
			return h("span", { className: "dshp-notice " + (notice.kind === "error" ? "is-bad" : "is-ok") }, notice.text);
		}

		function Btn(props) {
			const { kind, tiny, children, className, type, ...rest } = props;
			const cls = ["dshp-btn", kind ? "dshp-btn-" + kind : "dshp-btn-ghost", tiny ? "dshp-btn-tiny" : "", className || ""].filter(Boolean).join(" ");
			return h("button", Object.assign({ type: type || "button", className: cls }, rest), children);
		}

		const FLOW_STEPS = {
			apply: ["home", "locate", "override", "patch", "shim", "flash", "seed", "done"],
			revert: ["locate", "revert", "shim", "done"],
			uninstall: ["locate", "revert", "shim", "flash", "cleanup", "done"],
		};

		function flowLabel(id, t) {
			if (id === "revert") return t("flow.revert.step");
			if (id === "cleanup") return t("flow.cleanup");
			return t("flow." + id);
		}

		function ApplyFlow({ progress, busy, t }) {
			const kind = (progress && progress.kind) || "apply";
			const steps = FLOW_STEPS[kind] || FLOW_STEPS.apply;
			const stage = (progress && progress.stage) || "idle";
			const failed = Boolean(progress && progress.error);
			const active = Boolean(busy || (progress && progress.active));
			const idx = steps.indexOf(stage === "restart" ? "done" : stage);
			return h("div", {
				className: "dshp-flow" + (active ? " is-on" : "") + (failed ? " is-bad" : ""),
				"aria-label": t("flow.title"),
			},
				h("span", { className: "dshp-flow-kind" }, t("flow." + kind)),
				steps.flatMap((id, i) => {
					const done = idx > i || (stage === "done" && !failed);
					const cur = active && idx === i && stage !== "idle";
					const bad = failed && idx === i;
					const nodes = [];
					if (i) {
						nodes.push(h("span", {
							key: "w-" + id,
							className: "dshp-flow-wire" + (done || cur ? " is-on" : ""),
						}, h("i")));
					}
					nodes.push(h("span", {
						key: id,
						className: "dshp-flow-node" + (done ? " is-done" : "") + (cur ? " is-cur" : "") + (bad ? " is-bad" : ""),
					},
						h("b", null, String(i + 1)),
						h("em", null, flowLabel(id, t)),
					));
					return nodes;
				}),
			);
		}

		function Pill({ value, label }) {
			const t = useT();
			return h("span", { className: "dshp-pill is-" + statusKind(value) }, label || statusLabel(value, t));
		}

		const LAYER_GROUP = {
			"Prompt": "prompt",
			"Code": "code",
			"Tools": "tools",
			"0.1.5 compat": "compat",
			"0.2.0 compat": "dsh20",
		};
		const GROUP_ORDER = ["prompt", "code", "tools", "compat", "dsh20"];
		/* The host may report patch layer names in the host locale. The zh dictionary
		 * still keeps those labels, so map them at runtime instead of hardcoding CJK
		 * literals in this file. */
		for (const key of GROUP_ORDER) {
			const label = zh["group." + key];
			if (label && !LAYER_GROUP[label]) LAYER_GROUP[label] = key;
		}
		function layerGroupOf(layer) {
			if (LAYER_GROUP[layer]) return LAYER_GROUP[layer];
			/* zh labels the 0.2.0 layer as "0.2.0" while the host may append a suffix. */
			return String(layer || "").startsWith(zh["group.dsh20"]) ? "dsh20" : "code";
		}

		function patchRowsOf(state) {
			if (!state || !state.ai_base) return [];
			const fromList = Array.isArray(state.patches) ? state.patches : null;
			const rows = fromList
				? fromList.map((p) => ({
					id: Number(p.id),
					ids: Array.isArray(p.ids) && p.ids.length ? p.ids.map(Number) : [Number(p.id)],
					count: Math.max(1, Number(p.count) || (Array.isArray(p.ids) && p.ids.length ? p.ids.length : 1)),
					st: p.status || "missing_file",
					layer: p.layer || "",
					title: p.title || "",
				}))
				: Object.keys(state.patch_status || {}).map((id) => ({
					id: Number(id),
					ids: [Number(id)],
					count: 1,
					st: state.patch_status[id],
					layer: "",
					title: "",
				}));
			// 不再把 na 剔掉。以前这里 filter 掉 st==="na"，界面上 96 条只看到 83 条，
			// 用户以为补丁"丢了"。na 只是"这个宿主用不到这条"，本身也是有效状态，
			// 该显示出来，由视图切换决定要不要看它。
			return rows.filter((r) => r.st && Number.isFinite(r.id));
		}

		/* 补丁视图：全部 / 仅异常。默认全部，异常=待应用+漂移+对不上。 */
		function patchViewRows(rows, view) {
			if (view !== "issues") return rows;
			return rows.filter((r) => r.st === "pending" || r.st === "drifted" || r.st === "unmatched");
		}

		function patchIdLabel(r) {
			const ids = Array.isArray(r.ids) && r.ids.length ? r.ids : [r.id];
			return ids.map((id) => "#" + id).join("/");
		}

		function patchTitle(t, state, r) {
			if (r && r.title) return r.title;
			const id = r && typeof r === "object" ? r.id : r;
			const key = "patch." + id;
			const hit = t(key);
			if (hit && hit !== key) return hit;
			const names = state && state.patch_names;
			const name = names && (names[id] || names[String(id)]);
			return name || key;
		}

		function tallyPatches(rows) {
			/* 行可能是「分组行」（一条显示行合并了多补丁，带 ids/count）。
			   以前每行只 +1，96 条补丁合并成 79 行后界面就显示 79，
			   用户以为补丁丢了。这里按分组内真实补丁数累加。 */
			const out = { applied: 0, pending: 0, unmatched: 0, skipped: 0, drifted: 0, na: 0, total: 0, rows: 0 };
			for (const row of rows || []) {
				const n = Math.max(1, Number(row.count) || (Array.isArray(row.ids) ? row.ids.length : 1));
				out.total += n;
				out.rows += 1;
				if (row.st === "applied" || row.st === "already") out.applied += n;
				else if (row.st === "pending") out.pending += n;
				else if (row.st === "unmatched") out.unmatched += n;
				else if (row.st === "drifted") out.drifted += n;
				else if (row.st === "na") out.na += n;
				else out.skipped += n;
			}
			return out;
		}

		function PatchGroups({ state }) {
			const t = useT();
			const [open, setOpen] = useState({});
			// 默认「全部」：96 条一条不落。想只看问题时切「仅异常」。
			const [view, setView] = useState("all");
			if (!state || !state.patch_status) return h("div", { className: "dshp-skel", style: { height: 120 } });
			const located = !!state.ai_base;
			if (!located) return null;
			const allRows = patchRowsOf(state);
			const shownRows = patchViewRows(allRows, view);
			const issues = allRows.filter((r) => r.st === "pending" || r.st === "drifted" || r.st === "unmatched").length;
			const grouped = new Map();
			for (const row of shownRows) {
				const key = layerGroupOf(row.layer);
				if (!grouped.has(key)) grouped.set(key, []);
				grouped.get(key).push(row);
			}
			const naive = allRows.filter((r) => r.st === "na").length;
			return [
				h("div", { key: "__view", className: "dshp-pv" },
					h("div", { className: "dshp-pv-seg" },
						h("button", {
							type: "button",
							className: "dshp-pv-b" + (view === "all" ? " on" : ""),
							onClick: () => setView("all"),
						}, t("patchView.all") + " · " + allRows.length),
						h("button", {
							type: "button",
							className: "dshp-pv-b" + (view === "issues" ? " on" : ""),
							onClick: () => setView("issues"),
						}, t("patchView.issues") + " · " + issues)),
					naive
						? h("span", { className: "dshp-pv-na" }, t("patchView.naNote", { n: naive }))
						: null),
				...GROUP_ORDER.filter((key) => grouped.has(key)).map((key) => {
					const rows = grouped.get(key).slice().sort((a, b) => a.id - b.id);
					if (!rows.length) return null;
					const tally = tallyPatches(rows);
					const notes = [];
					if (tally.pending) notes.push(t("metric.pendingShort", { n: tally.pending }));
					if (tally.unmatched) notes.push(t("metric.unmatchedShort", { n: tally.unmatched }));
					if (tally.drifted) notes.push(t("metric.driftedShort", { n: tally.drifted }));
					if (tally.skipped) notes.push(t("metric.skipShort", { n: tally.skipped }));
					if (tally.na) notes.push(t("metric.naShort", { n: tally.na }));
					const expanded = !!open[key];
					return h("div", { key: key, className: "dshp-group" },
						h("button", {
							type: "button",
							className: "dshp-group-h",
							"aria-expanded": expanded ? "true" : "false",
							onClick: () => setOpen((prev) => Object.assign({}, prev, { [key]: !prev[key] })),
						},
							h("strong", null, t("group." + key)),
							h("span", { className: "dshp-count" }, tally.applied + "/" + tally.total + (notes.length ? " · " + notes.join(" · ") : "")),
						),
						expanded ? h("table", { className: "dshp-table" },
							h("thead", null, h("tr", null,
								h("th", null, "#"),
								h("th", null, t("table.patch")),
								h("th", null, t("table.status")),
							)),
							h("tbody", null, rows.map((r) => h("tr", { key: r.ids ? r.ids.join("-") : r.id },
								h("td", { className: "dshp-id" }, patchIdLabel(r)),
								h("td", null, patchTitle(t, state, r)),
								h("td", null, h(Pill, { value: r.st })),
							))),
						) : null,
					);
				}),
			];
		}

		function HooksDenySection({ onSaved }) {
			const t = useT();
			const [cfg, setCfg] = useState(null);
			const [notice, setNotice] = useState({ kind: "idle", text: "" });
			const [busy, setBusy] = useState(false);

			useEffect(() => {
				apiJson("/ys-pojia/hooks-deny")
					.then((d) => { if (d && d.ok) setCfg({ hooksDenyBypass: d.hooksDenyBypass !== false }); })
					.catch(() => {});
			}, []);

			const save = (hooksDenyBypass) => {
				if (!cfg || busy) return;
				setCfg({ hooksDenyBypass });
				setBusy(true);
				apiJson("/ys-pojia/hooks-deny", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ hooksDenyBypass }),
				})
					.then((d) => {
						if (d && d.ok) {
							setCfg({ hooksDenyBypass: d.hooksDenyBypass === true });
							setNotice({ kind: "ok", text: t("saved.hooksDeny") });
							if (typeof onSaved === "function") onSaved();
						} else {
							setNotice({ kind: "error", text: t("err.save", { error: (d && d.error) || "" }) });
						}
					})
					.catch((e) => setNotice({ kind: "error", text: t("err.save", { error: e.message }) }))
					.finally(() => setBusy(false));
			};

			if (!cfg) return null;
			return h("div", { className: "dshp-cr", style: { marginTop: 12 } },
				h("div", { className: "dshp-sub" },
					h("h4", null, t("hooksDeny.title")),
					noticeNode(notice),
				),
				h("p", { className: "dshp-hint", style: { margin: "0 0 4px", color: "var(--dshp-mute)", fontSize: 12 } }, t("hooksDeny.hint")),
				h("div", { className: "dshp-cr-row" },
					h("label", null,
						h("input", {
							type: "checkbox",
							checked: cfg.hooksDenyBypass === true,
							disabled: busy,
							onChange: (e) => save(e.target.checked),
						}),
						t("hooksDeny.bypass"),
					),
				),
			);
		}

		function ContinueRetrySection() {
			const t = useT();
			const [cfg, setCfg] = useState(null);
			const [notice, setNotice] = useState({ kind: "idle", text: "" });
			const [busy, setBusy] = useState(false);

			useEffect(() => {
				apiJson("/ys-pojia/continue/settings")
					.then((d) => { if (d && d.ok) setCfg(d); })
					.catch(() => {});
			}, []);

			const save = (patch) => {
				if (!cfg || busy) return;
				const next = { ...cfg, ...patch };
				if (next.autoRetry && !(Number(next.retryMax) > 0)) next.retryMax = 3;
				if (next.autoContinue && !(Number(next.continueMax) > 0)) next.continueMax = 3;
				setCfg(next);
				setBusy(true);
				apiJson("/ys-pojia/continue/settings", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(next),
				})
					.then((d) => {
						if (d && d.ok) {
							setCfg(d);
							setNotice({ kind: "ok", text: t("saved.continue") });
						} else {
							setNotice({ kind: "error", text: t("err.save", { error: (d && d.error) || "" }) });
						}
					})
					.catch((e) => setNotice({ kind: "error", text: t("err.save", { error: e.message }) }))
					.finally(() => setBusy(false));
			};

			if (!cfg) return null;
			return h("div", { className: "dshp-cr" },
				h("div", { className: "dshp-sub" },
					h("h4", null, t("continue.title")),
					noticeNode(notice),
				),
				h("p", { className: "dshp-hint", style: { margin: "0 0 4px", color: "var(--dshp-mute)", fontSize: 12 } }, t("continue.hint")),
				h("div", { className: "dshp-cr-row" },
					h("label", null,
						h("input", {
							type: "checkbox",
							checked: Boolean(cfg.autoRetry),
							disabled: busy,
							onChange: (e) => save({ autoRetry: e.target.checked }),
						}),
						t("continue.autoRetry"),
					),
					h("label", null,
						t("continue.retryMax"),
						h("input", {
							className: "dshp-field dshp-cr-num",
							type: "number",
							min: 0,
							max: 20,
							value: cfg.retryMax,
							disabled: busy,
							onChange: (e) => save({ retryMax: Number(e.target.value) }),
						}),
					),
				),
				h("div", { className: "dshp-cr-row" },
					h("label", null,
						h("input", {
							type: "checkbox",
							checked: Boolean(cfg.autoContinue),
							disabled: busy,
							onChange: (e) => save({ autoContinue: e.target.checked }),
						}),
						t("continue.autoContinue"),
					),
					h("label", null,
						t("continue.continueMax"),
						h("input", {
							className: "dshp-field dshp-cr-num",
							type: "number",
							min: 0,
							max: 20,
							value: cfg.continueMax,
							disabled: busy,
							onChange: (e) => save({ continueMax: Number(e.target.value) }),
						}),
					),
					h("label", null,
						t("continue.text"),
						h("input", {
							className: "dshp-field dshp-cr-text",
							type: "text",
							value: cfg.continueText || "",
							disabled: busy,
							onChange: (e) => save({ continueText: e.target.value }),
						}),
					),
				),
			);
		}

		function RestartAsk(props) {
			const node = h("div", {
				className: "dshp-restart-mask",
				"data-theme": props.theme === "dusk" ? "dusk" : "white",
				role: "dialog",
				"aria-modal": "true",
				"aria-labelledby": "dshp-restart-title",
				onClick: (e) => { if (e.target === e.currentTarget && props.onLater) props.onLater(); },
			},
				h("div", { className: "dshp-restart-card" },
					h("h4", { id: "dshp-restart-title" }, props.t("restart.ask.title")),
					h("p", null, props.t("restart.ask.body")),
					h("div", { className: "dshp-modal-ops" },
						h(Btn, { onClick: props.onLater }, props.t("restart.notNow")),
						h(Btn, { kind: "primary", onClick: props.onRestart }, props.t("restart.now")),
					),
				),
			);
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function" && typeof document !== "undefined" && document.body) {
					return rd.createPortal(node, document.body);
				}
			} catch { /* host 可能没暴露 react-dom */ }
			return node;
		}

/*
 * 三个子页签。做成函数而不是常量数组：常量在模块加载时就固定了语言，
 * 用户切到中文后这些标签仍是英文（或反过来）。每次渲染重新算一遍。
 */
function viewItems(t) {
  return [
    ["overview", t("view.overview")],
    ["patches", t("view.patches")],
    ["inject", t("view.inject")],
  ];
}

		
/* ── 宿主状态卡片 ─────────────────────────────────────────────────────────
   装完第一眼要回答的三个问题：宿主是什么版本、补丁打上没有、能用哪档引擎。
   这些信息原本分散在「引擎」和「补丁」两个视图里，首页只有一个补丁计数。

   数据来源：
     /ys-pojia/status  → host_version / host_supported / host_compat_known / patches_*
     /ys-pojia/engine/status → engines（目录）+ engine（当前）+ availability（各档可用性）
   ──────────────────────────────────────────────────────────────────────── */
function HostStatusCard(props) {
  const t = useT();
  const s = props.state || null;
  const [eng, setEng] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const lang = currentLang === "zh" ? "zh" : "en";
    apiJson("/ys-pojia/engine/status?locale=" + lang)
      .then((d) => { if (!cancelled && d && d.ok !== false) setEng(d); })
      .catch(() => { /* 取不到就不显示引擎块，不影响其它信息 */ });
    return () => { cancelled = true; };
  }, []);

  if (!s) return null;

  // ── 宿主版本与适配判定 ──
  const ver = String(s.host_version || "").trim();
  const known = s.host_compat_known === true;
  const supported = s.host_supported !== false;

  const level = (() => {
    if (!ver) return "none";
    if (!known) return "unknown";
    if (!supported) return "cross";
    // host_target 是 "0.2.2-rc.5 / 0.2.0-rc.2 / ..." 这种拼接串
    const list = String(s.host_target || "")
      .split("/")
      .map((x) => x.trim())
      .filter(Boolean);
    return list.includes(ver) ? "exact" : "minor";
  })();

  const levelText = {
    exact: t("host.level.exact"),
    minor: t("host.level.minor"),
    cross: t("host.level.cross"),
    unknown: t("host.level.unknown"),
    none: t("host.level.none"),
  }[level];

  const levelClass =
    level === "exact" ? "is-ok" : level === "minor" ? "is-warn" : level === "cross" ? "is-bad" : "is-mute";

  // ── 补丁进度 ──
  const applied = Number(s.display_applied != null ? s.display_applied : s.patches_applied || 0);
  const total = Number(s.display_total != null ? s.display_total : s.patches_total || 0);
  const drifted = Number(s.display_drifted != null ? s.display_drifted : s.patches_drifted || 0);
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((applied / total) * 100))) : 0;

  // ── 引擎 ──
  const engines = eng && Array.isArray(eng.engines) ? eng.engines : [];
  const current = eng && eng.engine ? String(eng.engine) : "";
  const avail = (eng && eng.availability) || {};

  return h("div", { className: "dshp-hostcard" },
    h("div", { className: "dshp-hc-row" },
      h("span", { className: "dshp-hc-label" }, t("host.card.title")),
      h("code", { className: "dshp-hc-ver" }, ver || t("host.card.nover")),
      h("span", { className: "dshp-hc-badge " + levelClass }, levelText),
    ),

    total > 0
      ? h("div", { className: "dshp-hc-row" },
          h("span", { className: "dshp-hc-label" }, t("host.card.patches")),
          h("div", { className: "dshp-hc-bar" }, h("i", { style: { width: pct + "%" } })),
          h("span", { className: "dshp-hc-num" }, applied + " / " + total),
          drifted > 0 ? h("span", { className: "dshp-hc-note is-warn" }, t("host.card.drifted").replace("{n}", drifted)) : null,
        )
      : null,

    engines.length
      ? h("div", { className: "dshp-hc-row" },
          h("span", { className: "dshp-hc-label" }, t("host.card.engines")),
          h("div", { className: "dshp-hc-engines" },
            engines.map((e) => {
              const on = String(e.id) === current;
              const a = avail[e.id] || {};
              const ok = a.state === "available";
              const deg = a.state === "degraded";
              const cls = on ? (ok ? "is-on" : deg ? "is-on-deg" : "is-on-bad") : "is-off";
              const label = currentLang === "zh" ? e.label : (e.label_en || e.label);
              const tip = Array.isArray(a.reasons) && a.reasons.length
                ? a.reasons.join("; ")
                : String(e.tagline || "");
              return h("span", {
                key: e.id,
                className: "dshp-hc-eng " + cls,
                title: tip,
              }, label + (on ? t("host.card.current") : ""));
            }),
          ),
        )
      : null,

    // 降级原因
    eng && eng.fellBack && eng.fellBackReason
      ? h("div", { className: "dshp-hc-row dshp-hc-why" },
          h("span", { className: "dshp-hc-label" }, t("host.card.why")),
          h("span", { className: "dshp-hc-reason" }, String(eng.fellBackReason)),
        )
      : null,

    // 宿主目录缺失
    !s.ai_base
      ? h("div", { className: "dshp-hc-row dshp-hc-why" },
          h("span", { className: "dshp-hc-label is-bad" }, "!"),
          h("span", { className: "dshp-hc-reason" }, t("host.card.nobase")),
        )
      : null,
  );
}

function PurgifySection() {
			useEffect(() => () => stopRestartPolling(), []);
			const [view, setView] = useState("overview");

			/* 仓库链接复制状态：'idle' | 'ok' | 'fail' */
			const [repoCopy, setRepoCopy] = useState("idle");
			/* 外部链接打开失败时的提示：'' | 文案 */
			const [repoOpenMsg, setRepoOpenMsg] = useState("");
			const t = useT();
			const tRef = useRef(t);
			tRef.current = t;
			const [state, setState] = useState(null);
			const [override, setOverride] = useState("");
			const [defaultOverride, setDefaultOverride] = useState("");
			const [overrideLoaded, setOverrideLoaded] = useState(false);
			const [ownServers, setOwnServers] = useState("");
			const [ownLoaded, setOwnLoaded] = useState(false);
			const [patchBusy, setPatchBusy] = useState(false);
			const [askRestart, setAskRestart] = useState(false);
			const suppressRestartAsk = useRef(false);
			const [askUninstall, setAskUninstall] = useState(false);
			const [uninstallBusy, setUninstallBusy] = useState(false);
			const [notice, setNotice] = useState({ kind: "idle", text: "" });
			const [updateInfo, setUpdateInfo] = useState(null);
			const [channel, setChannel] = useState("stable");
			const [pick, setPick] = useState({ stable: "", beta: "" });
			const actionTicket = useRef(0);
			const overrideRef = useRef("");
			const defaultOverrideRef = useRef("");
			const promptSeededRef = useRef(false);
			const promptDirtyRef = useRef(false);
			const promptAreaRef = useRef(null);
			overrideRef.current = override;
			defaultOverrideRef.current = defaultOverride;

			const readPromptBox = () => {
				const node = promptAreaRef.current;
				const live = node && typeof node.value === "string" ? node.value : overrideRef.current;
				overrideRef.current = live || "";
				return overrideRef.current;
			};

			/**
			 * 打开仓库相关的外部链接，并给真实反馈。
			 *
			 * 不能用 <a target=_blank> —— DSH 主进程把渲染进程的弹窗一律 deny，
			 * 点了没有任何反应。走 openExternalUrl 的三级回退，见文件顶部注释。
			 */
			const openRepoLink = async (url) => {
				const result = await openExternalUrl(url);
				if (result === "opened") { setRepoOpenMsg(""); return; }
				if (result === "copied") {
					setRepoOpenMsg(t("repo.openCopied"));
					window.setTimeout(() => setRepoOpenMsg(""), 4000);
					return;
				}
				setRepoOpenMsg(t("repo.openFailed"));
				window.setTimeout(() => setRepoOpenMsg(""), 4000);
			};

			/**
			 * 复制仓库地址。
			 *
			 * 为什么需要：部分环境（受限的 WebView、内嵌浏览器、企业策略）
			 * 会拦截 target=_blank 的跳转。给一个可复制的明文地址做兜底，
			 * 用户手动粘到浏览器一样能到。
			 */
			const copyRepoUrl = () => {
				try {
					if (navigator.clipboard && navigator.clipboard.writeText) {
						navigator.clipboard.writeText(REPO_URL).then(
							() => { setRepoCopy("ok"); window.setTimeout(() => setRepoCopy("idle"), 2000); },
							() => { setRepoCopy("fail"); window.setTimeout(() => setRepoCopy("idle"), 3000); },
						);
						return;
					}
					/* 老环境兜底：临时 textarea + execCommand */
					const ta = document.createElement("textarea");
					ta.value = REPO_URL;
					ta.setAttribute("readonly", "");
					ta.style.position = "fixed";
					ta.style.opacity = "0";
					document.body.appendChild(ta);
					ta.select();
					const ok = document.execCommand("copy");
					document.body.removeChild(ta);
					setRepoCopy(ok ? "ok" : "fail");
					window.setTimeout(() => setRepoCopy("idle"), ok ? 2000 : 3000);
				} catch {
					setRepoCopy("fail");
					window.setTimeout(() => setRepoCopy("idle"), 3000);
				}
			};

			const syncPicks = (d) => {
				const versions = (d && d.versions) || [];
				const ceiling = listedCeiling(versions, d && d.localVersion);
				const next = { stable: "" };
				for (const id of ["stable"]) {
					const list = versions.filter((item) => item.channel === id && keepListedVersion(item, ceiling));
					const hit = preferListed(list, d && d.localVersion, d && d.pin);
					next[id] = (hit && hit.ref) || "";
				}
				setPick(next);
			};

			const updateErrorText = (tr, e) => {
				const msg = String((e && e.message) || e || "");
				if (msg === "timeout" || /aborted|abort|超时/i.test(msg)) return tr("update.timeout");
				if (/\b404\b/.test(msg) || /non-json/.test(msg)) return tr("update.needRestart");
				return tr("update.fail", { error: msg });
			};


			const loadAll = useCallback(() => {
				const tr = tRef.current;
				apiJson("/ys-pojia/status")
					.then((d) => {
						if (d && d.ok) {
							setState(d);
							if (d.channel) setChannel(d.channel);
							if (d.update && d.update.ok && !d.update.error) setUpdateInfo(d.update);
							if (d.boot_full_quit && !suppressRestartAsk.current) setAskRestart(true);
						} else {
							setState({ ok: false, patches_total: 0, patches_applied: 0, patch_status: {}, shim_cmd: "n/a", shim_ps1: "n/a", shim_bin: "n/a", has_backup: false });
							setNotice({ kind: "error", text: tr("err.status", { error: (d && d.error) || "bad response" }) });
						}
					})
					.catch((e) => {
						setState({ ok: false, patches_total: 0, patches_applied: 0, patch_status: {}, shim_cmd: "n/a", shim_ps1: "n/a", shim_bin: "n/a", has_backup: false });
						setNotice({ kind: "error", text: tr("err.status", { error: e.message }) });
					});
				apiJson("/ys-pojia/override")
					.then((d) => {
						if (d && d.ok) {
							const packed = typeof d.defaultContent === "string" ? d.defaultContent : "";
							const shown = typeof d.content === "string" ? d.content : packed;
							if (packed) setDefaultOverride(packed);
							if (!promptSeededRef.current || !promptDirtyRef.current) {
								promptSeededRef.current = true;
								setOverride(shown || packed);
							}
							setOverrideLoaded(true);
						}
						else setNotice({ kind: "error", text: tr("err.override", { error: (d && d.error) || "" }) });
					})
					.catch((e) => setNotice({ kind: "error", text: tr("err.override", { error: e.message }) }));
				apiJson("/ys-pojia/own-servers")
					.then((d) => {
						if (d && d.ok) {
							setOwnServers(typeof d.content === "string" ? d.content : "");
							setOwnLoaded(true);
						}
					})
					.catch(() => {});
			}, []);

			useEffect(() => {
				loadAll();
				const timer = setTimeout(() => { loadAll(); }, 5000);
				return () => clearTimeout(timer);
			}, [loadAll]);

			useEffect(() => {
				if (!patchBusy && !uninstallBusy) return undefined;
				let stop = false;
				const tick = () => {
					apiJson("/ys-pojia/status")
						.then((d) => {
							if (stop || !d) return;
							if (d.apply_progress) {
								setState((prev) => Object.assign({}, prev || {}, d.ok ? d : { apply_progress: d.apply_progress }));
								return;
							}
							if (!d.ok) return;
							setState((prev) => Object.assign({}, prev || {}, d));
						})
						.catch(() => {});
				};
				tick();
				const id = setInterval(tick, 450);
				return () => {
					stop = true;
					clearInterval(id);
				};
			}, [patchBusy, uninstallBusy]);

			const rejectNeedPrompt = useCallback((tr) => {
				setAskRestart(false);
				setNotice({ kind: "error", text: tr("need.prompt") });
				setTimeout(() => window.alert(tr("need.prompt")), 0);
			}, []);

			const doAction = useCallback((action, actionKey) => {
				const tr = tRef.current;
				const label = tr(actionKey);
				const ticket = ++actionTicket.current;
				const run = () => {
					setPatchBusy(true);
					setAskRestart(false);
					setNotice({ kind: "idle", text: "" });
					setState((prev) => Object.assign({}, prev || {}, {
						apply_progress: {
							active: true,
							kind: action === "revert" ? "revert" : "apply",
							stage: action === "revert" ? "locate" : "home",
							error: "",
						},
					}));
					const applyContent = action === "apply" ? readPromptBox() : "";
					/* 走 apiJson：apply/revert 本来就配了 240s/120s 超时，裸 fetch 会挂死在半路。 */
					apiJson("/ys-pojia/" + action, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(action === "apply" ? { content: applyContent } : {}),
					})
						.then((d) => {
							if (ticket !== actionTicket.current) return;
							if (responseNeedsPrompt(d)) {
								rejectNeedPrompt(tr);
								return;
							}
							if (!d.ok) {
								setNotice({ kind: "error", text: tr("err.action", { action: label, error: d.error || "" }) });
								return;
							}
							if (action === "apply") {
								if (typeof d.defaultContent === "string") setDefaultOverride(d.defaultContent);
								if (typeof d.override_content === "string") {
									setOverride(d.override_content);
									setOverrideLoaded(true);
								}
							}
							if (action === "apply" && d.complete === false) {
								const parts = [];
								if (d.failed > 0) {
									const ids = (d.failed_items || [])
										.map((x) => x.id)
										.filter((id) => id != null)
										.join(",");
									parts.push(
										tr("restart.incomplete.patches", {
											failed: String(d.failed || 0),
											ids: ids || "?",
										}),
									);
								}
								if (d.cmd_flash && d.cmd_flash.ok === false) {
									parts.push(
										tr("restart.incomplete.flash", {
											entry: String(d.cmd_flash.entry || "fail"),
										}),
									);
								}
								if (parts.length === 0) parts.push(tr("restart.incomplete.flash", { entry: "unknown" }));
								setNotice({
									kind: "error",
									text: tr("restart.incomplete", { detail: parts.join("；") }),
								});
								loadAll();
								if (d.restarting || d.needs_full_quit) {
									suppressRestartAsk.current = false;
									setAskRestart(true);
								}
								return;
							}
							if (action === "apply") {
								setNotice({ kind: "ok", text: tr("ok.done") });
								loadAll();
								suppressRestartAsk.current = false;
								setAskRestart(true);
								return;
							}
							setNotice({ kind: "ok", text: tr("ok.done") });
							loadAll();
						})
						.catch((e) => {
							if (ticket !== actionTicket.current) return;
							setNotice({ kind: "error", text: tr("err.action", { action: label, error: e.message }) });
						})
						.finally(() => {
							if (ticket === actionTicket.current) setPatchBusy(false);
						});
				};
				run();
			}, [loadAll, rejectNeedPrompt, state]);

			const saveOverride = useCallback(() => {
				const tr = t;
				const ticket = ++actionTicket.current;
				const go = () => {
					setPatchBusy(true);
					setAskRestart(false);
					setNotice({ kind: "idle", text: "" });
					const content = readPromptBox();
					apiJson("/ys-pojia/override", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ content: content }),
					})
						.then((d) => {
							if (ticket !== actionTicket.current) return;
							if (!d.ok || responseNeedsPrompt(d)) {
								rejectNeedPrompt(tr);
								return;
							}
							if (typeof d.content === "string") {
								overrideRef.current = d.content;
								setOverride(d.content);
							}
							promptDirtyRef.current = false;
							setNotice({ kind: "ok", text: t("saved.override") });
						})
						.catch((e) => {
							if (ticket !== actionTicket.current) return;
							setNotice({ kind: "error", text: t("err.save", { error: e.message }) });
						})
						.finally(() => {
							if (ticket === actionTicket.current) setPatchBusy(false);
						});
				};
				bothInjectEmpty(readPromptBox(), defaultOverrideRef.current).then((empty) => {
					if (ticket !== actionTicket.current) return;
					if (empty) {
						rejectNeedPrompt(tr);
						return;
					}
					go();
				});
			}, [t, rejectNeedPrompt]);

			const restoreOverride = useCallback(() => {
				if (!defaultOverride) return;
				const tr = t;
				const ticket = ++actionTicket.current;
				overrideRef.current = defaultOverride;
				setOverride(defaultOverride);
				setPatchBusy(true);
				setNotice({ kind: "idle", text: "" });
				apiJson("/ys-pojia/override", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ content: defaultOverride }),
				})
					.then((d) => {
						if (ticket !== actionTicket.current) return;
						if (!d || !d.ok) {
							setNotice({ kind: "error", text: tr("err.save", { error: (d && d.error) || "" }) });
							return;
						}
						if (typeof d.content === "string") {
							overrideRef.current = d.content;
							setOverride(d.content);
						}
						promptDirtyRef.current = false;
						setNotice({ kind: "ok", text: tr("saved.restoreInject") });
					})
					.catch((e) => {
						if (ticket !== actionTicket.current) return;
						setNotice({ kind: "error", text: tr("err.save", { error: e.message }) });
					})
					.finally(() => {
						if (ticket === actionTicket.current) setPatchBusy(false);
					});
			}, [defaultOverride, t]);

			const waitHostAfterUninstall = useCallback((tr) => {
				stopRestartPolling();
				const started = Date.now();
				const ping = () => {
					fetch("/", { cache: "no-store", credentials: "same-origin" })
						.then((r) => {
							if (r.ok) {
								try {
									window.localStorage.removeItem("dshp-theme");
									window.localStorage.removeItem("dshp-theme-mode");
								} catch { /* ignore */ }
								window.location.reload();
								return;
							}
							retry();
						})
						.catch(retry);
				};
				const retry = () => {
					if (Date.now() - started > 90000) {
						setNotice({ kind: "error", text: tr("restart.timeout") });
						setUninstallBusy(false);
						return;
					}
					restartPollTimer = setTimeout(ping, 500);
				};
				restartPollTimer = setTimeout(ping, 800);
			}, []);

			const doUninstall = useCallback(() => {
				setUninstallBusy(true);
				setAskUninstall(false);
				setAskRestart(false);
				const tr = tRef.current;
				setNotice({ kind: "ok", text: tr("uninstall.applying") });
				setState((prev) => Object.assign({}, prev || {}, {
					apply_progress: { active: true, kind: "uninstall", stage: "locate", error: "" },
				}));
				apiJson("/ys-pojia/uninstall", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
					.then((d) => {
						if (!d || !d.ok) throw new Error((d && d.error) || "uninstall failed");
						setNotice({ kind: "ok", text: (d && d.note) || hostText(tr, "uninstall.done", d.surface || hostSurfaceOf(state)) });
						if ((d && d.surface) === "desktop" || (d && d.fullApp) || hostSurfaceOf(state) === "desktop") return;
						waitHostAfterUninstall(tr);
					})
					.catch((e) => {
						const msg = String((e && e.message) || e || "");
						if (/failed to fetch|networkerror|load failed/i.test(msg)) {
							setNotice({ kind: "ok", text: hostText(tr, "uninstall.done", hostSurfaceOf(state)) });
							if (hostSurfaceOf(state) === "desktop" || clientGuessSurface() === "desktop") return;
							waitHostAfterUninstall(tr);
							return;
						}
						setNotice({ kind: "error", text: tr("uninstall.fail", { error: msg }) });
						setUninstallBusy(false);
					});
			}, [state, waitHostAfterUninstall]);

			const s = state;
			const located = !!(s && s.ai_base);
			const hostSurface = hostSurfaceOf(s);
			const desktopLikely = hostSurface === "desktop" || clientGuessSurface() === "desktop";
			const sealedReady = !located && desktopLikely && !!(s && (s.asar_still_sealed || s.desktop_exe || s.desktop_install));
			const patchesLost = !located && !!(s && s.patches_lost);
			const tally = located ? tallyPatches(patchRowsOf(s)) : { applied: 0, pending: 0, unmatched: 0, skipped: 0, drifted: 0, total: 0 };
			const total = tally.total;
			const applied = tally.applied;
			const job = s && s.apply_progress;
			const jobOn = Boolean(patchBusy || uninstallBusy || (job && job.active));
			const jobSteps = FLOW_STEPS[(job && job.kind) || "apply"] || FLOW_STEPS.apply;
			const jobIdx = jobSteps.indexOf(job && job.stage === "restart" ? "done" : ((job && job.stage) || "idle"));
			const pct = jobOn
				? Math.round(((job && job.stage === "done" ? jobSteps.length : Math.max(jobIdx, 0) + 0.45) / jobSteps.length) * 100)
				: (located && total ? Math.round((applied / total) * 100) : 0);
			const metricNotes = [];
			if (tally.pending) metricNotes.push(t("metric.pendingShort", { n: tally.pending }));
			if (tally.unmatched) metricNotes.push(t("metric.unmatchedShort", { n: tally.unmatched }));
			if (tally.drifted) metricNotes.push(t("metric.driftedShort", { n: tally.drifted }));
			if (tally.skipped) metricNotes.push(t("metric.skipShort", { n: tally.skipped }));

			const versions = (updateInfo && updateInfo.versions) || [];
			const channelNow = (updateInfo && updateInfo.channel) || channel || "stable";
			const localVer = (s && s.plugin_version) || (updateInfo && updateInfo.localVersion) || "";
			return h("section", { className: "dshp-panel", "aria-label": t("purge.title") },
				h("div", { className: "dshp-head" },
					h("h3", { className: "dshp-title" }, t("purge.title")),
					h("span", { className: "dshp-pill" }, t("surface." + hostSurface)),
				),
				/* ── 工具行：左视图切换 / 右主操作，常驻顶部免滚动 ── */
				h("div", { className: "dshp-panebar" },
					h("div", { className: "dshp-switch", role: "tablist", "aria-label": t("purge.title") },
						viewItems(t).map((v) => h("button", {
							type: "button",
							key: v[0],
							role: "tab",
							"aria-selected": view === v[0] ? "true" : "false",
							className: view === v[0] ? "is-on" : "",
							onClick: () => setView(v[0]),
						}, v[1])),
					),
					h("div", { className: "dshp-row", style: { marginLeft: "auto" } },
					h(Btn, { kind: "primary", disabled: patchBusy || uninstallBusy || !overrideLoaded, onClick: () => doAction("apply", "action.apply") }, patchBusy ? t("btn.apply.busy") : t("btn.apply")),
					h(Btn, { kind: "danger", disabled: patchBusy || uninstallBusy, onClick: () => doAction("revert", "action.revert") }, t("btn.revert")),
					h(Btn, { kind: "solid-danger", disabled: patchBusy || uninstallBusy, onClick: () => setAskUninstall(true) }, uninstallBusy ? t("btn.uninstall.busy") : t("btn.uninstall")),
					noticeNode(notice),
				),
				),
				h(ApplyFlow, { progress: s && s.apply_progress, busy: patchBusy || uninstallBusy, t: t }),
				h("div", { className: "dshp-bar", "aria-hidden": "true" }, h("i", { style: { transform: "scaleX(" + (pct / 100) + ")" } })),
				view === "overview" ? h(react.Fragment, null,
				h(HostStatusCard, { state: s }),
				s ? h("div", { className: "dshp-metrics" },
					h("div", { className: "dshp-metric" },
						h("b", null, located ? (applied + " / " + total) : (patchesLost ? t("metric.lost.count") : (sealedReady ? t("metric.sealed.count") : t("metric.unlocated.count")))),
						h("span", null, !located ? (patchesLost ? t("metric.lost") : (sealedReady ? t("metric.sealed") : t("metric.unlocated"))) : (metricNotes.length ? metricNotes.join(" · ") : t("metric.purged"))),
					),
					h("div", { className: "dshp-metric" },
						h("b", { style: { fontSize: 13, fontFamily: "var(--dshp-mono)", fontWeight: 500 } },
							h("span", { className: "dshp-pill is-" + shimKind(s.shim_cmd) }, "cmd"),
							" ",
							h("span", { className: "dshp-pill is-" + shimKind(s.shim_ps1) }, "ps1"),
							" ",
							h("span", { className: "dshp-pill is-" + shimKind(s.shim_bin || "missing") }, "unix"),
						),
						h("span", null, (s.shim_cmd === "n/a" && s.shim_ps1 === "n/a" && (s.shim_bin === "n/a" || !s.shim_bin)) ? t("metric.shim.na") : t("metric.shim")),
					),
					h("div", { className: "dshp-metric" },
						h("b", null, s.has_backup ? t("metric.bak.yes") : t("metric.bak.no")),
						h("span", null, t("metric.bak.hint")),
					),
				) : h("div", { className: "dshp-metrics" },
					h("div", { className: "dshp-metric" }, h("div", { className: "dshp-skel" }), h("div", { className: "dshp-skel", style: { width: "40%" } })),
					h("div", { className: "dshp-metric" }, h("div", { className: "dshp-skel" }), h("div", { className: "dshp-skel", style: { width: "40%" } })),
					h("div", { className: "dshp-metric" }, h("div", { className: "dshp-skel" }), h("div", { className: "dshp-skel", style: { width: "40%" } })),
				),
				h("p", { className: "dshp-hint", style: { margin: "8px 0 0", color: "var(--dshp-mute)", fontSize: 12 } }, t("apply.hint")),
				s && !s.ai_base ? h("p", { className: "dshp-hint", style: { margin: "8px 0 0", color: "var(--dshp-danger, #c44)", fontSize: 12 } }, hostText(t, "warn.noRoot", hostSurface)) : null,
				s && s.ai_base && s.override_status === "missing" ? h("p", { className: "dshp-hint", style: { margin: "8px 0 0", color: "var(--dshp-mute)", fontSize: 12 } }, t("warn.noInject")) : null,
				s && s.ai_base && s.host_supported === false ? h("p", { className: "dshp-hint", style: { margin: "8px 0 0", color: "var(--dshp-danger, #c44)", fontSize: 12 } }, t("warn.hostVersion", { v: s.host_version || "?", t: s.host_target || "?" })) : null,
				  /* ── 仓库卡片：求 star + 说明无服务器 + 可复制兜底 ── */
				  h("div", { className: "dshp-repo" },
				    h("div", { className: "dshp-repo-head" },
				      h("span", { className: "dshp-repo-icon", "aria-hidden": "true" }, "★"),
				      h("div", { className: "dshp-repo-title" },
				        h("b", null, t("repo.title")),
				        h("em", null, t("repo.sub")),
				      ),
				    ),
				    h("p", { className: "dshp-repo-ask" }, t("repo.ask")),
				    h("p", { className: "dshp-repo-note" }, t("repo.note")),
				    /* ── 反馈入口：新功能建议 / 现有功能优化 / Bug 反馈，统一走 Issue ── */
				    h("div", { className: "dshp-repo-fb" },
				      h("b", { className: "dshp-repo-fb-title" }, t("repo.fbTitle")),
				      h("p", { className: "dshp-repo-fb-body" }, t("repo.fbBody")),
				    ),
				    h("div", { className: "dshp-repo-ops" },
				      h("button", {
				        type: "button",
				        className: "dshp-btn is-primary dshp-repo-btn",
				        onClick: () => openRepoLink(REPO_URL),
				      }, t("repo.btn")),
				      h("button", {
				        type: "button",
				        className: "dshp-btn dshp-repo-btn",
				        onClick: () => openRepoLink(REPO_URL + "/issues/new"),
				      }, t("repo.btnIssue")),
				      h("button", {
				        type: "button",
				        className: "dshp-btn dshp-repo-btn",
				        onClick: copyRepoUrl,
				      }, repoCopy === "ok" ? t("repo.copied") : repoCopy === "fail" ? t("repo.copyFail") : t("repo.copy")),
				    ),
				    repoOpenMsg ? h("p", { className: "dshp-repo-openmsg" }, repoOpenMsg) : null,
				    /* 跳转被拦时的兜底：明文地址，可选中可复制 */
				    h("div", { className: "dshp-repo-link" },
				      h("span", { className: "dshp-repo-linklabel" }, t("repo.linkHint")),
				      h("code", { className: "dshp-repo-url", onClick: copyRepoUrl, title: t("repo.copy") }, REPO_URL),
				    ),
),
				) : null,
				view === "patches" ? h(react.Fragment, null,
				h(PatchGroups, { state: s }),
				h(HooksDenySection, { onSaved: loadAll }),
				) : null,
				view === "inject" ? h(react.Fragment, null,
				h("div", { className: "dshp-sub" },
					h("h4", null, t("override.title")),
					h("div", { className: "dshp-row", style: { margin: 0 } },
						h(Btn, { kind: "primary", tiny: true, disabled: patchBusy || !overrideLoaded, onClick: saveOverride }, t("btn.saveInject")),
						h(Btn, { tiny: true, disabled: patchBusy || !overrideLoaded || !defaultOverride, onClick: restoreOverride }, t("btn.restoreInject")),
					),
				),
				h("textarea", {
					className: "dshp-area",
					ref: promptAreaRef,
					value: override,
					onChange: (e) => {
						promptDirtyRef.current = true;
						overrideRef.current = e.target.value;
						setOverride(e.target.value);
					},
					spellCheck: false,
					placeholder: "",
				}),
				promptBoxEmpty(override) ? h("p", {
					className: "dshp-hint",
					style: { margin: "8px 0 0", color: "var(--dshp-danger, #c44)", fontSize: 12 },
				}, t("need.prompt")) : null,
			) : null,
				askUninstall ? h("div", {
					className: "dshp-modal-bg",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "dshp-uninstall-title",
					onClick: (e) => { if (e.target === e.currentTarget && !uninstallBusy) setAskUninstall(false); },
				},
					h("div", { className: "dshp-modal" },
						h("h4", { id: "dshp-uninstall-title" }, t("uninstall.title")),
						h("p", null, t("uninstall.body")),
						h("div", { className: "dshp-modal-ops" },
							h(Btn, { disabled: uninstallBusy, onClick: () => setAskUninstall(false) }, t("uninstall.cancel")),
							h(Btn, { kind: "solid-danger", disabled: uninstallBusy, onClick: doUninstall }, t("uninstall.confirm")),
						),
					),
				) : null,
				askRestart ? h(RestartAsk, {
					t: t,
					theme: detectHostTheme(),
					onLater: () => {
						suppressRestartAsk.current = true;
						setAskRestart(false);
					},
					onRestart: () => {
						suppressRestartAsk.current = true;
						setAskRestart(false);
						restartDsh(setNotice, function () {}, t, hostSurface);
					},
				}) : null,
			);
		}

		function ruleLabel(r) {
			if (!r) return "";
			if (r.name !== r.id) return r.name + " (" + r.id + ")";
			return r.id;
		}

		function RulesSection() {
			const t = useT();
			const tRef = useRef(t);
			tRef.current = t;
			const [st, setSt] = useState(null);
			const [editId, setEditId] = useState(null);
			const [editName, setEditName] = useState("");
			const [editTarget, setEditTarget] = useState("AGENTS.md");
			const [content, setContent] = useState("");
			const [newId, setNewId] = useState("");
			const [newName, setNewName] = useState("");
			const [newTarget, setNewTarget] = useState("AGENTS.md");
			const [busy, setBusy] = useState(false);
			const [notice, setNotice] = useState({ kind: "idle", text: "" });

			const loadStatus = useCallback(() => {
				const tr = tRef.current;
				let cwd = "";
				try { cwd = clientCurrentCwd(); } catch { /* ignore */ }
				rulesApi("status", cwd ? { cwd: cwd } : undefined)
					.then((d) => {
						if (d && d.ok) setSt(d);
						else {
							setSt({ ok: false, rules: [], active: null });
							setNotice({ kind: "error", text: tr("err.rules", { error: (d && d.error) || "bad response" }) });
						}
					})
					.catch((e) => {
						setSt({ ok: false, rules: [], active: null });
						setNotice({ kind: "error", text: tr("err.rules", { error: e.message }) });
					});
			}, []);

			useEffect(() => { loadStatus(); }, [loadStatus]);

			const doPost = useCallback((action, payload, after) => {
				setBusy(true);
				setNotice({ kind: "idle", text: "" });
				rulesApi(action, payload)
					.then((d) => {
						if (d && d.ok) {
							setNotice({ kind: "ok", text: t("ok.done") });
							if (action === "save" || action === "activate") warnNeedPrompt(d, t);
							loadStatus();
							if (after) after();
						} else {
							warnNeedPrompt(d, t);
							setNotice({ kind: "error", text: t("err.action", { error: (d && d.error) || "" }) });
						}
					})
					.catch((e) => setNotice({ kind: "error", text: t("err.action", { error: e.message }) }))
					.finally(() => setBusy(false));
			}, [loadStatus, t]);

			const openRule = useCallback((id) => {
				setBusy(true);
				rulesApi("read", { id: id })
					.then((d) => {
						if (d.ok) {
							setEditId(id);
							setEditName(d.name || id);
							setEditTarget(d.target || "AGENTS.md");
							setContent(typeof d.content === "string" ? d.content : "");
						} else setNotice({ kind: "error", text: t("err.read", { error: d.error || "" }) });
					})
					.catch((e) => setNotice({ kind: "error", text: t("err.read", { error: e.message }) }))
					.finally(() => setBusy(false));
			}, [t]);

			const clearEditor = () => {
				setEditId(null);
				setEditName("");
				setEditTarget("AGENTS.md");
				setContent("");
			};

			let list;
			if (!st) {
				list = h("div", { className: "dshp-skel", style: { height: 80, margin: 12 } });
			} else if (!st.rules || st.rules.length === 0) {
				list = h("p", { className: "dshp-empty" }, t("rules.empty"));
			} else {
				list = st.rules.map((r) => {
					const isActive = r.id === st.active;
					const isEdit = r.id === editId;
					return h("div", {
						key: r.id,
						className: "dshp-ruleitem" + (isEdit ? " is-edit" : ""),
						role: "button",
						tabIndex: 0,
						onClick: () => openRule(r.id),
						onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRule(r.id); } },
					},
						h("div", { className: "dshp-rule-main" },
							h("span", { className: "dshp-rule-name" },
								ruleLabel(r),
								isActive ? h("span", { className: "dshp-pill is-ok" }, t("pill.current")) : null,
							),
							h("span", { className: "dshp-rule-meta" }, r.target + " · " + formatSize(r.size)),
						),
						h("div", { className: "dshp-rule-ops" },
							h(Btn, {
								tiny: true,
								kind: isActive ? undefined : "primary",
								disabled: busy || isActive,
								onClick: (e) => {
									e.stopPropagation();
									if (!isActive) doPost("activate", { id: r.id });
								},
							}, isActive ? t("btn.inUse") : t("btn.use")),
							h(Btn, {
								tiny: true,
								kind: "danger",
								disabled: busy,
								onClick: (e) => {
									e.stopPropagation();
									if (!window.confirm(t("confirm.delete", { id: r.id }))) return;
									if (editId === r.id) clearEditor();
									doPost("delete", { id: r.id });
								},
							}, t("delete")),
						),
					);
				});
			}

			const policyValue = (st && typeof st.workspace_policy === "string") ? st.workspace_policy : "fallback";
			const policyOptions = (st && Array.isArray(st.workspace_policies) && st.workspace_policies.length) ? st.workspace_policies : ["fallback", "strict", "always"];
			const cwdCandidates = (st && Array.isArray(st.cwd_candidates)) ? st.cwd_candidates : [];
			const cwdValue = (st && typeof st.cwd === "string") ? st.cwd : "";
			return h("section", { className: "dshp-panel", "aria-label": t("rules.title") },
				h("div", { className: "dshp-head" },
					h("h3", { className: "dshp-title" }, t("rules.title")),
					h("div", { className: "dshp-row", style: { margin: 0 } },
						noticeNode(notice),
						h(Btn, {
							tiny: true,
							kind: "danger",
							disabled: busy,
							onClick: () => {
								if (!window.confirm(t("rules.reset.confirm"))) return;
								clearEditor();
								doPost("reset", {});
							},
						}, t("rules.reset")),
					),
				),
				h("div", { className: "dshp-block" },
					h("div", { className: "dshp-policy-row" },
						h("label", { htmlFor: "dshp-policy-select" }, t("policy.title")),
						h("select", {
							id: "dshp-policy-select",
							className: "dshp-field",
							value: policyValue,
							disabled: busy || !st,
							onChange: (e) => doPost("set-policy", { policy: e.target.value }),
						}, policyOptions.map((p) => h("option", { key: p, value: p }, t("policy." + p)))),
					),
					h("p", { className: "dshp-block-hint" }, t("policy.hint")),
				),
				h("div", { className: "dshp-block" },
					h("div", { className: "dshp-block-head" },
						h("h4", null, t("cwd.title")),
						h(Btn, {
							tiny: true,
							disabled: busy,
							onClick: () => {
								let cwd = cwdValue;
								if (!cwd) { try { cwd = clientCurrentCwd(); } catch { /* ignore */ } }
								doPost("scan-cwd", cwd ? { cwd: cwd } : {});
							},
						}, t("cwd.rescan")),
					),
					cwdValue ? h("p", { className: "dshp-cwd-path" }, cwdValue) : null,
					(!st || !cwdValue)
						? h("p", { className: "dshp-empty" }, t("cwd.no.workspace"))
						: (cwdCandidates.length === 0
							? h("p", { className: "dshp-empty" }, t("cwd.empty"))
							: h("div", { className: "dshp-cwd-list" }, cwdCandidates.map((item) => h("label", {
								key: item.path,
								className: "dshp-cwd-item" + (item.selected ? " is-on" : ""),
							},
								h("input", {
									type: "checkbox",
									checked: Boolean(item.selected),
									disabled: busy,
									onChange: (e) => doPost("toggle-cwd", { path: item.path, enabled: e.target.checked }),
								}),
								h("div", { className: "dshp-cwd-main" },
									h("div", { className: "dshp-cwd-name" },
										h("span", null, item.name),
										h("span", { className: "dshp-cwd-badge" }, t("cwd.scope." + (item.scope || "cwd"))),
										h("span", { className: "dshp-cwd-size" }, formatSize(item.size || 0)),
									),
									h("div", { className: "dshp-cwd-sub" }, item.path),
									item.preview ? h("div", { className: "dshp-cwd-prev" }, item.preview) : null,
								),
							)))),
					h("p", { className: "dshp-block-hint" }, t("cwd.hint")),
				),
				h("div", { className: "dshp-block" },
				h("div", { className: "dshp-split" },
					h("div", { className: "dshp-rulelist" },
						h("div", { className: "dshp-rulebody" }, list),
						h("div", { className: "dshp-create" },
							h("div", { className: "dshp-create-row" },
								h("input", { className: "dshp-field", placeholder: t("ph.id"), value: newId, onChange: (e) => setNewId(e.target.value) }),
								h("input", { className: "dshp-field", placeholder: t("ph.alias"), value: newName, onChange: (e) => setNewName(e.target.value) }),
								h("select", { className: "dshp-field", style: { minWidth: 120, flex: "0 0 auto" }, value: newTarget, onChange: (e) => setNewTarget(e.target.value) },
									TARGETS.map((x) => h("option", { key: x, value: x }, x))),
								h(Btn, {
									kind: "primary",
									tiny: true,
									disabled: busy,
									onClick: () => {
										const id = newId.trim();
										if (!id) { setNotice({ kind: "error", text: t("need.id") }); return; }
										const name = newName.trim() || id;
										const target = newTarget;
										doPost("save", { id, content: "", name, target }, () => {
											setEditId(id);
											setEditName(name);
											setEditTarget(target);
											setContent("");
										});
										setNewId(""); setNewName(""); setNewTarget("AGENTS.md");
									},
								}, t("btn.create")),
							),
						),
					),
					h("div", { className: "dshp-editor" },
						editId ? [
							h("div", { key: "meta", className: "dshp-row" },
								h("input", {
									className: "dshp-field", placeholder: t("ph.alias.short"), value: editName,
									onChange: (e) => setEditName(e.target.value),
								}),
								h("select", {
									className: "dshp-field", style: { minWidth: 120 }, value: editTarget,
									onChange: (e) => setEditTarget(e.target.value),
								}, TARGETS.map((x) => h("option", { key: x, value: x }, x))),
							),
							h("textarea", {
								key: "body",
								className: "dshp-area", value: content,
								onChange: (e) => setContent(e.target.value),
								placeholder: "",
							}),
							h("div", { key: "save", className: "dshp-row" },
								h(Btn, {
									kind: "primary",
									disabled: busy,
									onClick: () => doPost("save", { id: editId, content, name: editName, target: editTarget }),
								}, t("btn.saveRule")),
								noticeNode(notice),
							),
						] : h("div", { className: "dshp-editor-empty" }, t("rules.pick")),
					),
				),
				),
			);
		}

		function skillUiAllowed(d) {
			if (!d) return false;
			const ver = String(d.plugin_version || d.localVersion || "").replace(/^v/i, "");
			if (/^1\.1\.11(?:-|$)/.test(ver)) return false;
			const parts = ver.match(/^(\d+)\.(\d+)\.(\d+)/);
			if (!parts) return false;
			if (+parts[1] !== 1) return +parts[1] > 1;
			if (+parts[2] !== 1) return +parts[2] > 1;
			return +parts[3] >= 12;
		}

		function splitListedVersion(raw) {
			const text = String(raw || "").trim().replace(/^v/i, "");
			const cut = text.split("-");
			const core = String(cut[0] || "").split(".").map((n) => parseInt(n, 10) || 0);
			return { core: [core[0] || 0, core[1] || 0, core[2] || 0], pre: cut.slice(1).join("-") };
		}

		function listedVersionNewer(remote, local) {
			if (!remote || !local || String(remote) === String(local)) return false;
			const a = splitListedVersion(remote);
			const b = splitListedVersion(local);
			for (let i = 0; i < 3; i += 1) {
				if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i];
			}
			if (a.pre && !b.pre) return false;
			if (!a.pre && b.pre) return true;
			return a.pre > b.pre;
		}

		function listedCeiling(versions, localVer) {
			let best = "";
			const rows = (versions || []).slice();
			const local = String(localVer || "").replace(/^v/i, "");
			if (local && !/(?:^|[-._])(beta|rc|pre|preview|test)(?:\d|$|[-._])/i.test(local)) {
				rows.push({ channel: "stable", version: local });
			}
			for (const item of rows) {
				if (!item) continue;
				const ver = String(item.version || "").replace(/^v/i, "");
				if (!/^\d+\.\d+\.\d+/.test(ver) || /(?:^|[-._])(beta|rc|pre|preview|test)(?:\d|$|[-._])/i.test(ver)) continue;
				if (!best || listedVersionNewer(ver, best)) best = ver;
			}
			return best;
		}

		function keepListedVersion(item, _ceiling) {
			if (!item) return false;
			// 只列正式版本：beta/rc/pre 一类一律不上列表。
			const ver = String(item.version || item.ref || item.id || "");
			return !/(?:^|[-._])(beta|rc|pre|preview|test)(?:\d|$|[-._])/i.test(ver);
		}

		function preferListed(list, localVer, pin) {
			const pinned = pin ? (list || []).find((item) => item.ref === pin) : null;
			if (pinned) return pinned;
			const ver = String(localVer || "").replace(/^v/i, "");
			const same = (list || []).filter((item) => ver && String(item.version || "").replace(/^v/i, "") === ver);
			if (same.length) {
				return same.find((item) => item.current)
					|| same.find((item) => item.latest)
					|| same[0];
			}
			return (list || []).find((item) => item.current)
				|| (list || []).find((item) => item.latest)
				|| (list || [])[0]
				|| null;
		}

		function versionChoiceLabel(item, tr) {
			const ver = String((item && item.version) || "").replace(/^v/i, "");
			const base = ver ? ("v" + ver) : ((item && (item.label || item.ref)) || "—");
			if (item && item.current) return base + " · " + tr("update.current");
			if (item && item.latest) return base + " · " + tr("update.tip");
			return base;
		}

		function SkillsSection() {
			const t = useT();
			const tRef = useRef(t);
			tRef.current = t;
			const [onBeta, setOnBeta] = useState(false);
			const [st, setSt] = useState(null);
			const [editId, setEditId] = useState(null);
			const [editDesc, setEditDesc] = useState("");
			const [content, setContent] = useState("");
			const [busy, setBusy] = useState(false);
			const [notice, setNotice] = useState({ kind: "idle", text: "" });
			const zipRef = useRef(null);
			const folderRef = useRef(null);

			const loadStatus = useCallback(() => {
				const tr = tRef.current;
				const fail = (e) => {
					setSt({ ok: false, skills: [] });
					setNotice({
						kind: "error",
						text: skillsRouteMissing(e) ? tr("err.skills.needRestart") : tr("err.skills", { error: (e && e.message) || e || "bad response" }),
					});
				};
				const apply = (d) => {
					if (d && d.ok) setSt({ ok: true, skills: d.skills || [] });
					else fail({ message: (d && d.error) || "bad response" });
				};
				apiJson("/ys-pojia/status")
					.then((d) => {
						const allowed = skillUiAllowed(d);
						setOnBeta(allowed);
						if (!allowed) {
							setSt(null);
							return;
						}
						if (d.skills) {
							apply({ ok: true, skills: d.skills });
							return;
						}
						skillsApi("status").then(apply).catch(fail);
					})
					.catch(() => {
						setOnBeta(false);
						setSt(null);
					});
			}, []);

			useEffect(() => { loadStatus(); }, [loadStatus]);

			const doPost = useCallback((action, payload, after) => {
				setBusy(true);
				setNotice({ kind: "idle", text: "" });
				skillsApi(action, payload)
					.then((d) => {
						if (d && d.ok) {
							setNotice({ kind: "ok", text: t("ok.done") });
							loadStatus();
							if (after) after(d);
						} else {
							setNotice({ kind: "error", text: t("err.action", { error: (d && d.error) || "" }) });
						}
					})
					.catch((e) => setNotice({
						kind: "error",
						text: skillsRouteMissing(e) ? t("err.skills.needRestart") : t("err.action", { error: e.message }),
					}))
					.finally(() => setBusy(false));
			}, [loadStatus, t]);

			const openSkill = useCallback((id) => {
				setBusy(true);
				skillsApi("read", { id: id })
					.then((d) => {
						if (d.ok) {
							setEditId(id);
							setEditDesc(d.description || "");
							setContent(typeof d.content === "string" ? d.content : "");
						} else setNotice({ kind: "error", text: t("err.read", { error: d.error || "" }) });
					})
					.catch((e) => setNotice({ kind: "error", text: t("err.read", { error: e.message }) }))
					.finally(() => setBusy(false));
			}, [t]);

			const clearEditor = () => {
				setEditId(null);
				setEditDesc("");
				setContent("");
			};

			const readAsBase64 = (file) => new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					const text = String(reader.result || "");
					const at = text.indexOf(",");
					resolve(at >= 0 ? text.slice(at + 1) : text);
				};
				reader.onerror = () => reject(new Error(t("need.import")));
				reader.readAsDataURL(file);
			});

			const importZip = (file) => {
				if (!file) {
					setNotice({ kind: "error", text: t("need.import") });
					return;
				}
				setBusy(true);
				setNotice({ kind: "ok", text: t("skills.importing") });
				readAsBase64(file)
					.then((data) => skillsApi("import", { data, name: file.name }))
					.then((d) => {
						if (!d || !d.ok) throw new Error((d && d.error) || "");
						setNotice({ kind: "ok", text: t("saved.import", { count: (d.imported || []).length || 1 }) });
						loadStatus();
					})
					.catch((e) => setNotice({
						kind: "error",
						text: skillsRouteMissing(e) ? t("err.skills.needRestart") : t("err.action", { error: e.message }),
					}))
					.finally(() => setBusy(false));
			};

			const keepFolderFile = (file) => {
				const rel = String(file.webkitRelativePath || file.name || "").replace(/\\/g, "/");
				if (!rel || rel.includes("..")) return false;
				if (/(^|\/)(node_modules|\.git|__MACOSX|\.system)(\/|$)/i.test(rel)) return false;
				if (/(^|\/)\._/.test(rel) || /\/\.DS_Store$/i.test(rel)) return false;
				return true;
			};

			const importFolder = (list) => {
				const files = Array.from(list || []).filter(keepFolderFile);
				if (!files.length) {
					setNotice({ kind: "error", text: t("err.import.folder") });
					return;
				}
				setBusy(true);
				setNotice({ kind: "ok", text: t("skills.importing") });
				Promise.all(files.map((file) => readAsBase64(file).then((content) => ({
					path: file.webkitRelativePath || file.name,
					content,
					encoding: "base64",
				}))))
					.then((payload) => skillsApi("import", {
						files: payload,
						name: String(payload[0] && payload[0].path || "").split("/")[0],
					}))
					.then((d) => {
						if (!d || !d.ok) throw new Error((d && d.error) || "");
						setNotice({ kind: "ok", text: t("saved.import", { count: (d.imported || []).length || 1 }) });
						loadStatus();
					})
					.catch((e) => setNotice({
						kind: "error",
						text: skillsRouteMissing(e) ? t("err.skills.needRestart") : t("err.action", { error: e.message }),
					}))
					.finally(() => setBusy(false));
			};

			if (!onBeta) return null;

			let list;
			if (!st) {
				list = h("div", { className: "dshp-skel", style: { height: 80, margin: 12 } });
			} else if (!st.skills || st.skills.length === 0) {
				list = h("p", { className: "dshp-empty" }, t("skills.empty"));
			} else {
				list = st.skills.map((item) => {
					const isEdit = item.id === editId;
					return h("div", {
						key: item.id,
						className: "dshp-ruleitem" + (isEdit ? " is-edit" : ""),
						role: "button",
						tabIndex: 0,
						onClick: () => openSkill(item.id),
						onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSkill(item.id); } },
					},
						h("div", { className: "dshp-rule-main" },
							h("span", { className: "dshp-rule-name" }, item.id),
							h("span", { className: "dshp-rule-meta" },
								(item.valid ? item.description : t("skills.invalid")) + " · " + formatSize(item.size),
							),
							item.valid ? h("span", { className: "dshp-rule-meta" },
								[
									item.userInvocable ? t("skills.call.slash", { cmd: "/" + item.id }) : t("skills.call.userOff"),
									item.modelInvocable ? t("skills.call.model") : t("skills.call.modelOff"),
								].join(" · "),
							) : null,
						),
						h("div", { className: "dshp-rule-ops" },
							h(Btn, {
								tiny: true,
								kind: "danger",
								disabled: busy,
								onClick: (e) => {
									e.stopPropagation();
									if (!window.confirm(t("confirm.delete.skill", { id: item.id }))) return;
									if (editId === item.id) clearEditor();
									doPost("delete", { id: item.id });
								},
							}, t("delete")),
						),
					);
				});
			}

			return h("section", { className: "dshp-panel", "aria-label": t("skills.title") },
				h("div", { className: "dshp-head" },
					h("h3", { className: "dshp-title" }, t("skills.title")),
					h("div", { className: "dshp-row", style: { margin: 0 } }, noticeNode(notice)),
				),
				h("p", { className: "dshp-hint", style: { margin: "0 0 10px", color: "var(--dshp-mute)", fontSize: 12 } }, hostText(t, "skills.hint", hostSurfaceOf())),
				h("div", { className: "dshp-split" },
					h("div", { className: "dshp-rulelist" },
						h("div", { className: "dshp-rulebody" }, list),
						h("div", { className: "dshp-create" },
							h("div", { className: "dshp-create-row" },
								h("input", {
									ref: zipRef,
									type: "file",
									accept: ".zip,.tgz,.tar.gz,.tar,.skill",
									style: { display: "none" },
									onChange: (e) => {
										const file = e.target.files && e.target.files[0];
										e.target.value = "";
										importZip(file);
									},
								}),
								h("input", {
									ref: (el) => {
										folderRef.current = el;
										if (!el) return;
										el.setAttribute("webkitdirectory", "");
										el.setAttribute("directory", "");
										el.multiple = true;
									},
									type: "file",
									multiple: true,
									style: { display: "none" },
									onChange: (e) => {
										const files = Array.from((e.target && e.target.files) || []);
										e.target.value = "";
										importFolder(files);
									},
								}),
								h(Btn, {
									kind: "primary",
									tiny: true,
									disabled: busy,
									onClick: () => zipRef.current && zipRef.current.click(),
								}, t("btn.importZip")),
								h(Btn, {
									tiny: true,
									disabled: busy,
									onClick: () => folderRef.current && folderRef.current.click(),
								}, t("btn.importFolder")),
							),
						),
					),
					h("div", { className: "dshp-editor" },
						editId ? [
							h("div", { key: "meta", className: "dshp-row" },
								h("input", {
									className: "dshp-field",
									placeholder: t("ph.skill.desc"),
									value: editDesc,
									onChange: (e) => setEditDesc(e.target.value),
								}),
							),
							h("textarea", {
								key: "body",
								className: "dshp-area",
								value: content,
								onChange: (e) => setContent(e.target.value),
								spellCheck: false,
								placeholder: "",
							}),
							h("div", { key: "save", className: "dshp-row" },
								h(Btn, {
									kind: "primary",
									disabled: busy,
									onClick: () => doPost("save", { id: editId, content, description: editDesc }),
								}, t("btn.saveSkill")),
								noticeNode(notice),
							),
						] : h("div", { className: "dshp-editor-empty" }, t("skills.pick")),
					),
				),
			);
		}

		function reopenAfterRestart() {
			window.location.reload();
		}

		/* 重启/卸载后的 500ms 轮询共用一个定时器：组件卸载或流程取消时要能停掉，
		   否则面板关掉之后它还会跑到 90 秒超时。 */
		let restartPollTimer = 0;
		function stopRestartPolling() {
			if (restartPollTimer) { clearTimeout(restartPollTimer); restartPollTimer = 0; }
		}

		function waitForRestart(setNotice, setBusy, t) {
			stopRestartPolling();
			const started = Date.now();
			// 必须先看到旧进程掉线，再等新进程就绪；否则同进程立刻 200 会被当成「重启成功」又弹重启。
			let sawDown = false;
			const ping = () => {
				fetch("/ys-pojia/status", { cache: "no-store", credentials: "same-origin" })
					.then((r) => (r.ok ? r.json() : Promise.reject()))
					.then((d) => {
						if (!sawDown) {
							retry();
							return;
						}
						if (d && d.ok && d.ready !== false) reopenAfterRestart();
						else retry();
					})
					.catch(() => {
						sawDown = true;
						retry();
					});
			};
			const retry = () => {
				if (Date.now() - started > 90000) {
					setNotice({ kind: "error", text: t("restart.timeout") });
					setBusy(false);
					return;
				}
				restartPollTimer = setTimeout(ping, 500);
			};
			restartPollTimer = setTimeout(ping, 800);
		}

		let restartOnce = false;

		function restartDsh(setNotice, setBusy, t, surface) {
			if (restartOnce) return;
			const surf = surface || clientGuessSurface() || "desktop";
			const desktop = surf === "desktop" || clientGuessSurface() === "desktop";
			restartOnce = true;
			setBusy(true);
			setNotice({ kind: "ok", text: hostText(t, "restarting", surf) });
			const stop = (error) => {
				restartOnce = false;
				setNotice({ kind: "error", text: error ? t("restart.fail", { error }) : t("restart.notStarted") });
				setBusy(false);
			};
			let sawDrop = false;
			const watch = setTimeout(() => {
				if (sawDrop) return;
				stop("");
			}, 25000);
			fetch("/ys-pojia/restart", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
				.then((r) => r.json())
				.then((d) => {
					if (!d.ok) throw new Error(d.error || "restart failed");
					const next = (d && d.surface) || surf;
					const full = next === "desktop" || (d && d.fullApp) || desktop;
					if (full && d.already) {
						setNotice({ kind: "ok", text: hostText(t, "restarting", next) });
						return;
					}
					if (full && d.restarting === false) {
						clearTimeout(watch);
						stop(d.error || "not started");
						return;
					}
					setNotice({ kind: "ok", text: hostText(t, "restarting", next) });
					if (full) return;
					clearTimeout(watch);
					restartOnce = false;
					waitForRestart(setNotice, setBusy, t);
				})
				.catch((e) => {
					const msg = String((e && e.message) || e || "");
					const dropped = /failed to fetch|networkerror|load failed/i.test(msg) || e.name === "TypeError";
					if (dropped && desktop) {
						sawDrop = true;
						clearTimeout(watch);
						return;
					}
					clearTimeout(watch);
					stop(msg || "restart failed");
				});
		}

		function detectHostTheme() {
			try {
				if (typeof document !== "undefined") {
					const root = document.documentElement;
					if (document.body?.hasAttribute("data-ds-dark-theme") || root?.hasAttribute("data-ds-dark-theme")) return "dusk";
					const scheme = (root.style.colorScheme || getComputedStyle(root).colorScheme || getComputedStyle(root).getPropertyValue("color-scheme") || "").toLowerCase();
					if (scheme.includes("dark")) return "dusk";
					if (scheme.includes("light")) return "white";
				}
				if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
					return "dusk";
				}
			} catch { /* ignore */ }
			return "white";
		}

		function readTheme() {
			return detectHostTheme();
		}

		function SettingsRoot(props) {
			useEffect(() => () => stopRestartPolling(), []);
			const t = typeof props.t === "function" ? props.t : ((key) => key);
			const [theme, setTheme] = useState(readTheme);
			useEffect(() => {
				let cancelled = false;
				let timer = 0;
				const syncFromHost = () => {
					if (!cancelled) setTheme(detectHostTheme());
				};
				const syncSoon = () => {
					if (timer) window.clearTimeout(timer);
					timer = window.setTimeout(syncFromHost, 50);
				};
				syncFromHost();
				let mq;
				try {
					mq = window.matchMedia?.("(prefers-color-scheme: dark)");
					mq?.addEventListener?.("change", syncFromHost);
				} catch { /* ignore */ }
				let obs;
				try {
					obs = new MutationObserver(syncSoon);
					if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
					obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
				} catch { /* ignore */ }
				return () => {
					cancelled = true;
					if (timer) window.clearTimeout(timer);
					try { mq?.removeEventListener?.("change", syncFromHost); } catch { /* ignore */ }
					try { obs?.disconnect(); } catch { /* ignore */ }
				};
			}, []);
			return h("div", { className: "dshp-root", "data-theme": theme },
				h("style", null, PURGE_CSS),
				h(PurgifySection, null),
			);
		}

		const REWIND_CSS = `
.dshp-rewind-wrap{position:relative;display:inline-flex}
.dshp-rewind{appearance:none;display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,currentColor);font:12px/1 var(--ds-font-sans,system-ui,sans-serif);cursor:pointer}
.dshp-rewind:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,currentColor)}
.dshp-rewind:disabled{opacity:.4;cursor:default}
.dshp-rewind svg{display:block}
.dshp-rewind-menu{position:fixed;z-index:2147483000;box-sizing:border-box;min-width:220px;padding:4px;border:0;border-radius:12px;background:var(--dsw-specific-menu,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.16));transform:translateY(-100%)}
body[data-ds-dark-theme] .dshp-rewind-menu{background:var(--dsw-specific-menu,#32312d);color:var(--dsw-alias-label-primary,#e6e2db);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,#3f3d38);box-shadow:var(--dsw-elevation-prominent,0 10px 28px rgba(0,0,0,.45))}
.dshp-rewind-item{display:flex;flex-direction:column;gap:2px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:12px/1.3 var(--ds-font-sans,system-ui,sans-serif)}
.dshp-rewind-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.dshp-rewind-item b{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,inherit)}
.dshp-rewind-item span{color:var(--dsw-alias-label-tertiary,#9a958c);font-size:11px}
body[data-ds-dark-theme] .dshp-rewind-item span{color:var(--dsw-alias-label-tertiary,#a8a39a)}
.dshp-continue{appearance:none;display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,currentColor);font:12px/1 var(--ds-font-sans,system-ui,sans-serif);cursor:pointer}
.dshp-continue:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,currentColor)}
.dshp-continue:disabled{opacity:.4;cursor:default}
.dshp-continue.is-ready{color:var(--dsw-alias-label-primary,currentColor)}
.dshp-continue svg{display:block}
`;
		const DRAFT_KEY = "dshp-rewind-draft:";
		const ARM_KEY = "dshp-rewind-arm:";
		const FILL_DELAYS = [0, 50, 180, 400, 800];
		const ARM_TTL_MS = 45 * 1000;
		let rewindSeenAt = 0;
		let rewindSessions = null;
		let rewindHost = null;
		let rewindWorkspace = null;
		let rewindConversation = null;
		let pendingComposer = { sessionId: "", text: "", at: 0 };
		let armedFill = { sessionId: "", text: "", at: 0 };

		function rewindText(t, key, fallback) {
			try {
				if (typeof t === "function") {
					const value = t(key);
					if (value && value !== key) return value;
				}
			} catch { /* ignore */ }
			return fallback;
		}

		function currentSessionId(sessions) {
			try {
				const selected = rewindWorkspace?.selection?.getSnapshot?.()?.sessionId;
				if (typeof selected === "string" && selected) return selected;
			} catch { /* ignore */ }
			try {
				const snap = sessions?.list?.getSnapshot?.();
				if (typeof snap?.current === "string" && snap.current) return snap.current;
			} catch { /* ignore */ }
			return "";
		}

		function sessionKnown(sessions, sessionId) {
			try {
				const snap = sessions?.list?.getSnapshot?.();
				if (!snap || !sessionId) return false;
				if (snap.byId && Object.prototype.hasOwnProperty.call(snap.byId, sessionId)) return true;
				if (Array.isArray(snap.ids) && snap.ids.includes(sessionId)) return true;
			} catch { /* ignore */ }
			return false;
		}

		function waitMs(ms) {
			return new Promise((resolve) => window.setTimeout(resolve, ms));
		}

		function isPluginDraft(text) {
			const value = String(text || "").trim();
			if (!value) return false;
			return /^\[MNEMON\]/i.test(value)
				|| /MNEMON RUNTIME MEMORY SNAPSHOT/i.test(value)
				|| /^MNEMON VIEW TOOLS/im.test(value);
		}

		function writeDraft(sessionId, text) {
			if (!sessionId) return;
			const value = isPluginDraft(text) ? "" : (text || "");
			pendingComposer = { sessionId, text: value, at: Date.now() };
			try { sessionStorage.setItem(DRAFT_KEY + sessionId, value); } catch { /* ignore */ }
		}

		function peekDraft(sessionId) {
			if (!sessionId) return "";
			if (pendingComposer.sessionId === sessionId && pendingComposer.text) return pendingComposer.text;
			try { return sessionStorage.getItem(DRAFT_KEY + sessionId) || ""; } catch { return ""; }
		}

		function clearStoredDraft(sessionId) {
			if (!sessionId) return;
			if (pendingComposer.sessionId === sessionId) pendingComposer = { sessionId: "", text: "", at: 0 };
			try { sessionStorage.removeItem(DRAFT_KEY + sessionId); } catch { /* ignore */ }
			try { sessionStorage.removeItem(ARM_KEY + sessionId); } catch { /* ignore */ }
		}

		function armComposerFill(sessionId, text) {
			if (!sessionId || !text || isPluginDraft(text)) return;
			const at = Date.now();
			armedFill = { sessionId, text, at };
			writeDraft(sessionId, text);
			try { sessionStorage.setItem(ARM_KEY + sessionId, String(at)); } catch { /* ignore */ }
		}

		function takeArmedFill(sessionId) {
			if (!sessionId) return "";
			let text = "";
			let at = 0;
			if (armedFill.sessionId === sessionId && armedFill.text) {
				text = armedFill.text;
				at = armedFill.at;
			} else {
				text = peekDraft(sessionId);
				try { at = Number(sessionStorage.getItem(ARM_KEY + sessionId) || 0); } catch { at = 0; }
			}
			if (!text || !at || Date.now() - at > ARM_TTL_MS) {
				if (text && (!at || Date.now() - at > ARM_TTL_MS)) clearStoredDraft(sessionId);
				return "";
			}
			clearStoredDraft(sessionId);
			armedFill = { sessionId: "", text: "", at: 0 };
			return text;
		}

		function conversationFace() {
			if (rewindConversation) return rewindConversation;
			const host = rewindHost;
			if (host?.conversation) return host.conversation;
			if (typeof host?.get === "function") {
				try { return host.get("conversation"); } catch { return undefined; }
			}
			return undefined;
		}

		function conversationInput(sessionId) {
			try {
				const input = conversationFace()?.input;
				if (!input || !sessionId) return null;
				if (typeof input.shell === "function") {
					try { return input.shell(sessionId); } catch { /* session not retained yet */ }
				}
				const sessions = rewindHost?.sessions || rewindSessions;
				const actx = typeof sessions?.scope === "function" ? sessions.scope(sessionId) : undefined;
				if (typeof input.for === "function" && actx) return input.for(actx);
				return null;
			} catch {
				return null;
			}
		}

		function liveDraft(sessionId, inputActions) {
			try {
				const fromActions = inputActions?.state?.getSnapshot?.()?.draft;
				if (typeof fromActions === "string") return fromActions;
			} catch { /* ignore */ }
			try {
				const draft = conversationInput(sessionId)?.state?.getSnapshot?.()?.draft;
				if (typeof draft === "string") return draft;
			} catch { /* ignore */ }
			return "";
		}

		function hostSetDraft(sessionId, text) {
			if (!sessionId) return false;
			try {
				const input = conversationInput(sessionId);
				if (input && typeof input.setDraft === "function") {
					input.setDraft(text || "");
					return true;
				}
			} catch { /* ignore */ }
			return false;
		}

		function fillComposer(inputActions, text) {
			if (inputActions && typeof inputActions.setDraft === "function") {
				try { inputActions.setDraft(text || ""); } catch { /* ignore */ }
			}
		}

		function scheduleComposerFill(sessionId, text, inputActions) {
			if (!sessionId || !text || isPluginDraft(text)) return () => {};
			let stopped = false;
			let filled = false;
			const timers = [];
			const tryFill = () => {
				if (stopped) return;
				const current = liveDraft(sessionId, inputActions);
				if (filled && current !== text) {
					stopped = true;
					return;
				}
				if (current && current !== text) {
					stopped = true;
					return;
				}
				fillComposer(inputActions, text);
				hostSetDraft(sessionId, text);
				filled = true;
			};
			for (const ms of FILL_DELAYS) timers.push(window.setTimeout(tryFill, ms));
			return () => {
				stopped = true;
				for (const t of timers) { try { window.clearTimeout(t); } catch { /* ignore */ } }
			};
		}

		function scheduleEchoClear(sessionId, inputActions) {
			if (!sessionId) return () => {};
			let last = "";
			let stopped = false;
			const timers = [];
			const tryClear = () => {
				if (stopped || !last) return;
				const current = String(liveDraft(sessionId, inputActions) || "").trim();
				if (!current) {
					stopped = true;
					return;
				}
				if (current !== last) return;
				fillComposer(inputActions, "");
				hostSetDraft(sessionId, "");
				clearStoredDraft(sessionId);
				stopped = true;
			};
			apiJson("/ys-pojia/last-user?sessionId=" + encodeURIComponent(sessionId)).then((data) => {
				if (stopped) return;
				last = String(data?.text || "").trim();
				if (!last || isPluginDraft(last)) return;
				tryClear();
				for (const ms of [0, 50, 180, 400]) timers.push(window.setTimeout(tryClear, ms));
			}).catch(() => {});
			return () => {
				stopped = true;
				for (const t of timers) { try { window.clearTimeout(t); } catch { /* ignore */ } }
			};
		}

		async function dropInheritedQueue(sessions, sessionId) {
			if (!sessions || !sessionId) return;
			const drop = async () => {
				try {
					const actx = typeof sessions.scope === "function" ? sessions.scope(sessionId) : undefined;
					const face = typeof sessions.sessionOf === "function" ? sessions.sessionOf(actx) : undefined;
					const queue = face?.getSnapshot?.()?.queue || [];
					for (const item of queue) {
						const id = item?.id || item?.itemId;
						if (!id) continue;
						try { await face.updateQueue?.(id, { kind: "remove" }); } catch { /* ignore */ }
					}
				} catch { /* ignore */ }
			};
			await drop();
			window.setTimeout(() => { drop(); }, 80);
		}

		async function openRewoundSession(sessions, sessionId) {
			if (!sessionId) return;
			const workspace = rewindWorkspace;
			let lastError = null;
			for (let attempt = 0; attempt < 25; attempt += 1) {
				if (sessions && typeof sessions.refresh === "function" && !sessionKnown(sessions, sessionId)) {
					try { await sessions.refresh(); } catch (error) { lastError = error; }
				}
				const known = sessionKnown(sessions, sessionId);
				if (known || typeof sessions?.open === "function") {
					try {
						if (workspace && typeof workspace.openSession === "function") {
							workspace.openSession(sessionId);
						} else if (typeof sessions?.open === "function") {
							sessions.open(sessionId);
						} else {
							throw new Error("Cannot open the rewound session");
						}
						const selected = workspace?.selection?.getSnapshot?.()?.sessionId;
						if (!workspace || selected === sessionId) {
							await dropInheritedQueue(sessions, sessionId);
							window.setTimeout(() => { dropInheritedQueue(sessions, sessionId); }, 250);
							return;
						}
					} catch (error) {
						lastError = error;
					}
				}
				await waitMs(120);
			}
			throw new Error((lastError && lastError.message) || "The rewound session did not open");
		}

		class RewindSafe extends Component {
			constructor(p) { super(p); this.state = { failed: false }; }
			static getDerivedStateFromError() { return { failed: true }; }
			componentDidCatch(error) { try { console.error("[ys-pojia] rewind slot:", error); } catch { /* ignore */ } }
			render() {
				if (this.state.failed) return h(RewindFallback, this.props);
				return h(RewindButton, this.props);
			}
		}

		class ContinueSafe extends Component {
			constructor(p) { super(p); this.state = { failed: false }; }
			static getDerivedStateFromError() { return { failed: true }; }
			componentDidCatch(error) { try { console.error("[ys-pojia] continue slot:", error); } catch { /* ignore */ } }
			render() {
				if (this.state.failed) {
					return h("button", {
						type: "button",
						className: "dshp-continue",
						title: rewindText(translate, "continue.label", "Continue"),
						onMouseDown: (e) => e.preventDefault(),
						onClick: async () => {
							const sessionId = currentSessionId(rewindSessions);
							if (!sessionId) return;
							try {
								const data = await apiJson("/ys-pojia/continue", {
									method: "POST",
									headers: { "content-type": "application/json" },
									body: JSON.stringify({ sessionId, force: true }),
								});
								if (!data || !data.ok) throw new Error((data && data.error) || "continue");
							} catch (e) {
								window.alert(rewindText(translate, "continue.fail", "Continue failed: {error}").replace("{error}", String((e && e.message) || e)));
							}
						},
					}, rewindText(translate, "continue.label", "Continue"));
				}
				return h(ContinueButton, this.props);
			}
		}

		function ContinueButton(props) {
			const t = props.t || translate;
			const sessions = rewindSessions;
			const sessionId = props.sessionId || currentSessionId(sessions);
			const [busy, setBusy] = useState(false);
			const [notice, setNotice] = useState("");
			const [info, setInfo] = useState(null);

			useEffect(() => {
				if (!sessionId) {
					setInfo(null);
					return;
				}
				let cancelled = false;
				const tick = () => {
					apiJson("/ys-pojia/continue?sessionId=" + encodeURIComponent(sessionId))
						.then((data) => { if (!cancelled && data && data.ok) setInfo(data); })
						.catch(() => {});
				};
				tick();
				const timer = window.setInterval(tick, 1200);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [sessionId]);

			const canContinue = Boolean(info && info.canContinue);
			const left = info ? Math.max(0, (info.continueMax || 0) - (info.continueUsed || 0)) : 0;
			const runContinue = async () => {
				if (!sessionId || busy || !canContinue) return;
				setBusy(true);
				setNotice("");
				try {
					const data = await apiJson("/ys-pojia/continue", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ sessionId }),
					});
					if (!data || !data.ok) throw new Error((data && data.error) || "continue");
					setInfo((prev) => prev ? { ...prev, ...data, canContinue: false, continueUsed: data.used } : data);
				} catch (e) {
					setNotice(rewindText(t, "continue.fail", "Continue failed: {error}").replace("{error}", String((e && e.message) || e)));
				} finally {
					setBusy(false);
				}
			};

			const label = busy
				? rewindText(t, "continue.busy", "Continuing…")
				: rewindText(t, "continue.label", "Continue");
			const title = notice
				|| (canContinue
					? rewindText(t, "continue.ready", "Continue ({left} left)").replace("{left}", String(left))
					: (info && info.reason && left <= 0
						? rewindText(t, "continue.limit", "Continue limit reached")
						: rewindText(t, "continue.aria", "Continue after an abnormal stop")));
			return h("button", {
				type: "button",
				className: "dshp-continue" + (canContinue ? " is-ready" : ""),
				title,
				"aria-label": rewindText(t, "continue.aria", "Continue after an abnormal stop"),
				disabled: busy || !sessionId || !canContinue,
				onMouseDown: (e) => e.preventDefault(),
				onClick: (e) => {
					e.preventDefault();
					e.stopPropagation();
					runContinue();
				},
			},
				h("svg", { viewBox: "0 0 16 16", width: "14", height: "14", "aria-hidden": true },
					h("path", { fill: "currentColor", d: "M4.2 2.8v10.4L13 8 4.2 2.8z" }),
				),
				label,
			);
		}

		function rewindMenuNode(t, menuPos, menuRef, runRewind) {
			const menu = h("div", {
				className: "dshp-rewind-menu",
				role: "menu",
				ref: menuRef,
				style: menuPos ? { left: menuPos.left + "px", top: menuPos.top + "px" } : { left: "8px", bottom: "48px", transform: "none" },
			},
				h("button", {
					type: "button",
					className: "dshp-rewind-item",
					onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); },
					onClick: (e) => { e.preventDefault(); e.stopPropagation(); runRewind("once"); },
				},
					h("b", null, rewindText(t, "rewind.once", "Undo last step")),
					h("span", null, rewindText(t, "rewind.once.hint", "Withdraw the last step into a new session that keeps earlier context; the line returns to the box")),
				),
				h("button", {
					type: "button",
					className: "dshp-rewind-item",
					onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); },
					onClick: (e) => { e.preventDefault(); e.stopPropagation(); runRewind("round"); },
				},
					h("b", null, rewindText(t, "rewind.round", "Undo last turn")),
					h("span", null, rewindText(t, "rewind.round.hint", "Withdraw the last turn (and its subagents) into a new session that keeps earlier context; the line returns to the box")),
				),
			);
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function" && typeof document !== "undefined") {
					return rd.createPortal(menu, document.body);
				}
			} catch { /* 没有 portal 时菜单仍挂在按钮旁 */ }
			return menu;
		}

		class RewindFallback extends Component {
			constructor(p) {
				super(p);
				this.state = { menu: false, busy: false, notice: "", menuPos: null };
				this.wrap = null;
				this.menuEl = null;
				this.onDoc = (event) => {
					if (this.wrap && this.wrap.contains(event.target)) return;
					if (this.menuEl && this.menuEl.contains(event.target)) return;
					this.setState({ menu: false });
				};
			}
			componentDidMount() {
				document.addEventListener("mousedown", this.onDoc);
			}
			componentWillUnmount() {
				document.removeEventListener("mousedown", this.onDoc);
			}
			run(mode) {
				const sessionId = this.props.sessionId || currentSessionId(rewindSessions);
				if (!sessionId || this.state.busy) return;
				this.setState({ busy: true, menu: false, notice: "" });
				apiJson("/ys-pojia/rewind", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ sessionId, mode }),
				}).then(async (data) => {
					if (!data || !data.ok || !data.sessionId || data.cleared === false) {
						throw new Error((data && data.error) || "The previously sent content was not cleared");
					}
					if (data.at) rewindSeenAt = data.at;
					const text = isPluginDraft(data.text) ? "" : (data.text || "");
					armComposerFill(data.sessionId, text);
					await openRewoundSession(rewindSessions, data.sessionId);
					scheduleComposerFill(data.sessionId, text);
					this.setState({ busy: false });
				}).catch((e) => {
					this.setState({
						busy: false,
						notice: "Undo failed: " + String((e && e.message) || e),
					});
				});
			}
			openMenu() {
				const rect = this.wrap && this.wrap.getBoundingClientRect ? this.wrap.getBoundingClientRect() : null;
				this.setState({
					menu: !this.state.menu,
					notice: "",
					menuPos: rect ? { left: Math.max(8, rect.right - 228), top: Math.max(8, rect.top - 8) } : null,
				});
			}
			render() {
				const sessionId = this.props.sessionId || currentSessionId(rewindSessions);
				const t = this.props.t || translate;
				const label = this.state.busy ? "Undoing…" : (this.state.notice ? this.state.notice.slice(0, 18) : "Undo");
				return h("div", { className: "dshp-rewind-wrap", ref: (node) => { this.wrap = node; } },
					h("style", null, REWIND_CSS),
					h("button", {
						type: "button",
						className: "dshp-rewind",
						disabled: this.state.busy || !sessionId,
						onMouseDown: (e) => e.preventDefault(),
						onClick: (e) => { e.preventDefault(); this.openMenu(); },
					}, label),
					this.state.menu ? rewindMenuNode(t, this.state.menuPos, (node) => { this.menuEl = node; }, (mode) => this.run(mode)) : null,
				);
			}
		}

		function RewindButton(props) {
			const t = props.t || translate;
			const sessions = rewindSessions;
			const inputActions = props.inputActions;
			const sessionId = props.sessionId || currentSessionId(sessions);
			const wrapRef = useRef(null);
			const menuRef = useRef(null);
			const [busy, setBusy] = useState(false);
			const [notice, setNotice] = useState("");
			const [menu, setMenu] = useState(false);
			const [menuPos, setMenuPos] = useState(null);

			useEffect(() => {
				if (!sessionId) return;
				const armed = takeArmedFill(sessionId);
				if (armed) {
					scheduleComposerFill(sessionId, armed, inputActions);
					return;
				}
				scheduleEchoClear(sessionId, inputActions);
			}, [sessionId, inputActions]);

			useEffect(() => {
				if (!menu) return;
				const onDoc = (event) => {
					if (wrapRef.current && wrapRef.current.contains(event.target)) return;
					if (menuRef.current && menuRef.current.contains(event.target)) return;
					setMenu(false);
				};
				document.addEventListener("mousedown", onDoc);
				return () => document.removeEventListener("mousedown", onDoc);
			}, [menu]);

			const runRewind = async (mode) => {
				if (!sessionId || busy) return;
				setBusy(true);
				setMenu(false);
				setNotice("");
				try {
					const data = await apiJson("/ys-pojia/rewind", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ sessionId, mode }),
					});
					if (!data || !data.ok || !data.sessionId || data.cleared === false) {
						throw new Error((data && data.error) || "The previously sent content was not cleared");
					}
					if (data.at) rewindSeenAt = data.at;
					const text = isPluginDraft(data.text) ? "" : (data.text || "");
					armComposerFill(data.sessionId, text);
					await openRewoundSession(sessions, data.sessionId);
					scheduleComposerFill(data.sessionId, text);
				} catch (e) {
					const message = rewindText(t, "rewind.fail", "Undo failed: {error}").replace("{error}", String((e && e.message) || e));
					setNotice(message);
				} finally {
					setBusy(false);
				}
			};

			const onClick = (event) => {
				event?.preventDefault?.();
				event?.stopPropagation?.();
				if (!sessionId || busy) return;
				if (menu) {
					setMenu(false);
					return;
				}
				const rect = wrapRef.current?.getBoundingClientRect?.();
				if (rect) {
					setMenuPos({
						left: Math.max(8, rect.right - 228),
						top: Math.max(8, rect.top - 8),
					});
				}
				setNotice("");
				setMenu(true);
			};

			const failLabel = notice
				? (notice.length > 18 ? notice.slice(0, 18) + "…" : notice)
				: "";
			const label = busy
				? rewindText(t, "rewind.busy", "Undoing…")
				: (failLabel || rewindText(t, "rewind.label", "Undo"));
			const title = notice || rewindText(t, "rewind.aria", "Undo");
			return h("div", { className: "dshp-rewind-wrap", ref: wrapRef },
				h("style", null, REWIND_CSS),
				h("button", {
					type: "button",
					className: "dshp-rewind",
					title,
					"aria-label": rewindText(t, "rewind.aria", "Undo"),
					"aria-expanded": menu ? "true" : "false",
					disabled: busy || !sessionId,
					onMouseDown: (e) => e.preventDefault(),
					onClick,
				},
					h("svg", { viewBox: "0 0 16 16", width: "14", height: "14", "aria-hidden": true },
						h("path", {
							fill: "currentColor",
							d: "M7.2 3.2 3.4 7l3.8 3.8V8.6c2.8 0 4.7.7 5.9 2.3-.2-2.8-1.9-5.2-5.9-5.6V3.2z",
						}),
					),
					label,
				),
				menu ? rewindMenuNode(t, menuPos, menuRef, runRewind) : null,
			);
		}

		function installRewindWatch(ctx) {
			const sessions = ctx.sessions;
			if (!sessions) return () => {};
			const tick = async () => {
				try {
					const data = await apiJson("/ys-pojia/rewind");
					if (!data || !data.sessionId || !data.at || data.at <= rewindSeenAt) return;
					rewindSeenAt = data.at;
					const current = currentSessionId(sessions);
					if (current && current !== data.parentId) return;
					const text = isPluginDraft(data.text) ? "" : (data.text || "");
					armComposerFill(data.sessionId, text);
					scheduleComposerFill(data.sessionId, text);
					await openRewoundSession(sessions, data.sessionId);
					scheduleComposerFill(data.sessionId, text);
				} catch { /* ignore */ }
			};
			const timer = window.setInterval(tick, 1200);
			return () => window.clearInterval(timer);
		}


		const WELCOME_KEY = "ys-pojia-user-notice-v2";

		/**
		 * 首次弹窗强制阅读秒数。
		 *
		 * 为什么要有：用户须读完全部须知才能确认，直接放行等于没读。
		 * 6 秒 ≈ 中文 300 字的浏览时间，够看清条款标题与禁止事项，
		 * 又不至于让人等得不耐烦。
		 */
		const WELCOME_COUNTDOWN_SEC = 6;
		
		function readWelcomeAck() {
			try { return window.localStorage.getItem(WELCOME_KEY) === "1"; } catch { return false; }
		}
		function writeWelcomeAck() {
			try { window.localStorage.setItem(WELCOME_KEY, "1"); } catch { /* ignore */ }
		}


		let dockBus = { open: false, tab: "clean", authOpen: false, pending: "tab", listeners: new Set() };
		function getDock() { return dockBus; }
		function setDock(patch) {
			dockBus = Object.assign({}, dockBus, patch);
			dockBus.listeners.forEach((fn) => { try { fn(dockBus); } catch { /* ignore */ } });
		}
		function useDock() {
			const [st, setSt] = useState(dockBus);
			useEffect(() => {
				const fn = (next) => setSt(next);
				dockBus.listeners.add(fn);
				return () => { dockBus.listeners.delete(fn); };
			}, []);
			return st;
		}

		/* 兼容入口：多处调用点仍引用这两个名字，统一指向「破甲」页。 */
		function openArmorTab() {
			setDock({ open: true, tab: "armor", authOpen: false, pending: "tab" });
		}

		function requestArmorEnv() {
			openArmorTab();
		}

		function openDockClean() {
			setDock({ open: true, tab: "clean", authOpen: false, pending: "tab" });
		}
		function toggleDock() {
			if (dockBus.open) setDock({ open: false, authOpen: false, pending: "tab" });
			else openDockClean();
		}

		const DOCK_GEOM_KEY = "ys-pojia-dock-geom-v4";
		/* 默认停在右上，底边留在输入框上面。拖动之后停在用户松开的位置，只保证不拖出窗口。 */
		const DOCK_COMPOSER_CLEAR = 172;
		function defaultDockGeom() {
			const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
			const vh = typeof window !== "undefined" ? window.innerHeight : 800;
			const w = Math.min(620, Math.max(380, vw - 16));
			const y = 48;
			const h = Math.max(240, Math.min(640, vh - y - DOCK_COMPOSER_CLEAR));
			return { x: Math.max(8, vw - w - 8), y: y, w: w, h: h };
		}
		function clampDockGeom(g) {
			const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
			const vh = typeof window !== "undefined" ? window.innerHeight : 800;
			const w = Math.min(Math.max(380, Number(g && g.w) || 620), Math.max(380, vw - 16));
			const h = Math.min(Math.max(240, Number(g && g.h) || 520), Math.max(240, vh - 16));
			const x = Math.min(Math.max(8, Number(g && g.x) || 8), Math.max(8, vw - w - 8));
			const y = Math.min(Math.max(8, Number(g && g.y) || 8), Math.max(8, vh - Math.min(h, vh - 16) - 8));
			return { x: x, y: y, w: w, h: h };
		}
		function loadDockGeom() {
			try {
				const raw = JSON.parse(window.localStorage.getItem(DOCK_GEOM_KEY) || "null");
				if (raw && typeof raw === "object") return clampDockGeom(raw);
			} catch { /* ignore */ }
			return clampDockGeom(defaultDockGeom());
		}
		function saveDockGeom(g) {
			try { window.localStorage.setItem(DOCK_GEOM_KEY, JSON.stringify(clampDockGeom(g))); } catch { /* ignore */ }
		}

		function WelcomeNotice() {
			const t = useT();
			const [open, setOpen] = useState(() => !readWelcomeAck());
			const [checked, setChecked] = useState(false);
			const [left, setLeft] = useState(WELCOME_COUNTDOWN_SEC);

			/* 倒计时：每秒减 1，到 0 停。弹窗关闭或卸载时清 timer。 */
			useEffect(() => {
				if (!open) return undefined;
				if (left <= 0) return undefined;
				const timer = window.setTimeout(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
				return () => window.clearTimeout(timer);
			}, [open, left]);
			if (!open) return null;
			const ready = left <= 0;
			const repo = t("welcome.repo");
			const node = h("div", { className: "dshp-auth-mask", role: "dialog", "aria-modal": "true" },
				h("div", { className: "dshp-auth-modal", style: { width: "min(560px,100%)" } },
					h("h2", null, t("welcome.title")),
					h("div", { className: "muted", style: { color: "var(--dsw-alias-label-secondary,#999)", fontSize: 12 } }, t("welcome.lead")),
					h("div", { className: "dshp-auth-warn" }, t("welcome.warn")),
					h("div", { className: "dshp-auth-legal", style: { height: "auto", maxHeight: 380 } },
						h("p", null, t("welcome.body")),
						repo ? h("p", null,
							h("a", {
								href: repo,
								style: { color: "var(--dsw-alias-label-brand, #8fbf9a)", wordBreak: "break-all", cursor: "pointer" },
								onClick: (e) => { e.preventDefault(); openExternalUrl(repo); },
							}, repo),
						) : null,
						h("h3", null, t("welcome.bans")),
						h("p", null, t("welcome.ban1")),
						h("p", null, t("welcome.ban2")),
						h("p", null, t("welcome.ban3")),
						h("h3", null, t("welcome.disct")),
						h("p", null, t("welcome.disc1")),
						h("p", null, t("welcome.disc2")),
						h("p", null, t("welcome.disc3")),
						h("p", null, t("welcome.disc4")),
						h("h3", null, t("welcome.triggerT")),
						h("p", null, t("welcome.triggerLead")),
						h("div", { className: "dshp-trigger-box" },
							h("code", { className: "dshp-trigger-word" }, t("welcome.triggerWord")),
							h("div", { className: "dshp-trigger-arrow", "aria-hidden": "true" }, "↓"),
							h("code", { className: "dshp-trigger-reply" }, t("welcome.triggerReply")),
						),
						h("p", { className: "dshp-trigger-note" }, t("welcome.triggerNote")),
					),
					h("div", { className: "dshp-auth-checks" },
						h("label", null,
							h("input", {
								type: "checkbox",
								checked: checked,
								onChange: (e) => setChecked(!!(e && e.target && e.target.checked)),
							}),
							h("span", null, t("welcome.check")),
						),
					),
					h("div", { className: "dshp-auth-ops" },
							/* 倒计时未结束时显示剩余秒数，读完才能点 */
							!ready
								? h("span", { className: "dshp-auth-count", "aria-live": "polite" }, t("welcome.count", { n: left }))
								: null,
						h("button", {
							type: "button",
							className: "primary",
							disabled: !checked || !ready,
							"aria-disabled": !checked || !ready ? "true" : "false",
							title: !ready ? t("welcome.countTip", { n: left }) : (!checked ? t("welcome.checkTip") : ""),
							onClick: () => {
								if (!checked || !ready) return;
								writeWelcomeAck();
								setOpen(false);
							},
						}, ready ? t("welcome.ok") : t("welcome.okWait", { n: left })),
					),
				),
			);
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function" && typeof document !== "undefined" && document.body) {
					return rd.createPortal(node, document.body);
				}
			} catch { /* ignore */ }
			return node;
		}

		function AuthGate(props) {
			const t = useT();
			const [left, setLeft] = useState(10);
			const [readEnd, setReadEnd] = useState(false);
			const [checks, setChecks] = useState({ read: false, scope: false, ban: false });
			const legalRef = useRef(null);
			useEffect(() => {
				const id = window.setInterval(() => {
					setLeft((n) => {
						if (n <= 1) { window.clearInterval(id); return 0; }
						return n - 1;
					});
				}, 1000);
				return () => window.clearInterval(id);
			}, []);
			useEffect(() => {
				const el = legalRef.current;
				if (!el) return;
				if (el.scrollHeight <= el.clientHeight + 4) setReadEnd(true);
			}, []);
			const locked = left > 0 || !readEnd;
			const ready = !locked && checks.read && checks.scope && checks.ban;
			const hint = left > 0
				? t("auth.hint.wait").replace("{n}", String(left))
				: (readEnd ? t("auth.hint.check") : t("auth.hint.scroll"));
			const onScroll = () => {
				const el = legalRef.current;
				if (!el) return;
				if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadEnd(true);
			};
			const toggle = (id) => {
				if (locked) return;
				setChecks((prev) => Object.assign({}, prev, { [id]: !prev[id] }));
			};
			const okLabel = !ready
				? t("auth.ok")
				: (props.pending === "full"
					? t("auth.ok.full")
					: (props.pending === "env" ? t("auth.ok.env") : t("auth.ok.tab")));
			return h("div", { className: "dshp-auth-mask", role: "dialog", "aria-modal": "true" },
				h("div", { className: "dshp-auth-modal" },
					h("h2", null, t("auth.title")),
					h("div", { className: "muted", style: { color: "var(--dsw-alias-label-secondary,#999)", fontSize: 12 } }, t("auth.lead")),
					h("div", { className: "dshp-auth-warn" }, t("auth.warn")),
					h("div", {
						className: "dshp-auth-legal",
						ref: legalRef,
						onScroll,
					}),
					h("div", { style: { color: "var(--dsw-alias-label-secondary,#999)", fontSize: 12 } }, hint),
					h("div", { className: "dshp-auth-checks" },
						[["read", "auth.check.read"], ["scope", "auth.check.scope"], ["ban", "auth.check.ban"]].map((row) =>
							h("label", { key: row[0], className: locked ? "locked" : "" },
								h("input", {
									type: "checkbox",
									checked: !!checks[row[0]],
									disabled: locked,
									onChange: () => toggle(row[0]),
								}),
								h("span", null, t(row[1])),
							),
						),
					),
					h("div", { className: "dshp-auth-ops" },
						h("button", { type: "button", onClick: () => setDock({ authOpen: false, tab: "clean", pending: "tab" }) }, t("auth.no")),
						h("button", {
							type: "button",
							className: "primary",
							disabled: !ready,
							onClick: () => {
								if (!ready) return;
								setDock({ authOpen: false, open: true, tab: "armor", pending: "tab" });
							},
						}, okLabel),
					),
				),
			);
		}

		function isHackerPresetId(value) {
			const text = String(value || "").trim();
			if (!text) return false;
			if (text === "hacker") return true;
			if (/^red[\s_-]*team$/i.test(text)) return true;
			const label = text.replace(/不是嘿客/g, "").replace(/非嘿客/g, "");
			if (/嘿客/.test(label)) return true;
			return false;
		}

		function readSessionAgentPreset(sess) {
			if (!sess || typeof sess !== "object") return "";
			try {
				const pv = sess.projectionValues;
				if (pv && typeof pv.agentPreset === "string") return pv.agentPreset;
			} catch { /* ignore */ }
			try {
				if (typeof sess.agentPreset === "string") return sess.agentPreset;
			} catch { /* ignore */ }
			try {
				const header = sess.header;
				if (header && typeof header.agentPreset === "string") return header.agentPreset;
			} catch { /* ignore */ }
			return "";
		}

		function readSessionCwd(sess) {
			if (!sess || typeof sess !== "object") return "";
			try {
				const pv = sess.projectionValues;
				if (pv && typeof pv.cwd === "string" && pv.cwd.trim()) return pv.cwd.trim();
			} catch { /* ignore */ }
			try {
				if (typeof sess.cwd === "string" && sess.cwd.trim()) return sess.cwd.trim();
			} catch { /* ignore */ }
			try {
				const header = sess.header;
				if (header && typeof header.cwd === "string" && header.cwd.trim()) return header.cwd.trim();
			} catch { /* ignore */ }
			return "";
		}

		function clientCurrentCwd() {
			try {
				const sessions = rewindSessions || (rewindHost && rewindHost.sessions);
				if (!sessions) return "";
				const sid = currentSessionId(sessions);
				if (!sid) return "";
				try {
					const snap = typeof sessions.list?.getSnapshot === "function" ? sessions.list.getSnapshot() : null;
					const sess = snap && snap.byId ? snap.byId[sid] : null;
					const found = readSessionCwd(sess);
					if (found) return found;
				} catch { /* ignore */ }
				try {
					const actx = typeof sessions.scope === "function" ? sessions.scope(sid) : undefined;
					const face = typeof sessions.sessionOf === "function" ? sessions.sessionOf(actx) : undefined;
					const faceSnap = face && typeof face.getSnapshot === "function" ? face.getSnapshot() : face;
					const found = readSessionCwd(faceSnap);
					if (found) return found;
				} catch { /* ignore */ }
			} catch { /* ignore */ }
			return "";
		}

		function isHackerModeActive() {
			try {
				const sessions = rewindSessions || (rewindHost && rewindHost.sessions);
				const sid = currentSessionId(sessions);
				if (sid && sessions) {
					try {
						const snap = typeof sessions.list?.getSnapshot === "function" ? sessions.list.getSnapshot() : null;
						const sess = snap && snap.byId ? snap.byId[sid] : null;
						if (isHackerPresetId(readSessionAgentPreset(sess))) return true;
					} catch { /* ignore */ }
					try {
						const actx = typeof sessions.scope === "function" ? sessions.scope(sid) : undefined;
						const face = typeof sessions.sessionOf === "function" ? sessions.sessionOf(actx) : undefined;
						const faceSnap = face && typeof face.getSnapshot === "function" ? face.getSnapshot() : face;
						if (isHackerPresetId(readSessionAgentPreset(faceSnap))) return true;
					} catch { /* ignore */ }
				}
			} catch { /* ignore */ }
			/* 新会话：模式下拉里的「嘿客模式」chip（选好但还没写入 session）
			 * 优先走语义化 data-* 挂点,其次 class 子串模糊匹配 + 文本兜底;
			 * 不写死 CSS Module 哈希(HKgFRW_seat 这种每次构建都会变)。 */
			try {
				const semantic = document.querySelector(
					"[data-agent-preset='hacker'], [data-preset-id='hacker'], [data-mode='hacker']"
				);
				if (semantic) return true;
				const nodes = document.querySelectorAll(
					"[class*='seat' i][class*='label' i], [class*='seatLabel' i], button[class*='seat' i], [role='button'][class*='seat' i]"
				);
				for (const el of nodes) {
					const text = String(el.textContent || "").replace(/\s+/g, " ").trim();
					if (/嘿客模式/.test(text) || /^Hacker\b/i.test(text)) return true;
				}
			} catch { /* ignore */ }
			try {
				/* Match the mode label in either language; the Chinese title is rebuilt from
				 * code points so this file does not hardcode CJK literals. */
				const zhHackerLabel = String.fromCharCode(0x7ea2, 0x961f);
				const labels = document.querySelectorAll(
					"[class*='label' i][class*='preset' i], [class*='presetLabel' i], [title*='" + zhHackerLabel + "'], [title*='Red team' i], [title*='Hacker' i]"
				);
				for (const el of labels) {
					const text = String(el.textContent || "").trim();
					if (/嘿客模式/.test(text) || /^Hacker\b/i.test(text)) return true;
					if (isHackerPresetId(text)) return true;
				}
			} catch { /* ignore */ }
			return false;
		}

		function looksLikeSendControl(el) {
			if (!el || el.nodeType !== 1) return false;
			const btn = el.closest("button, [role='button']");
			if (!btn) return false;
			if (btn.closest(".dshp-dock, .dshp-auth-mask, .rt-dock, .dshp-env-gate")) return false;
			const label = [
				btn.getAttribute("aria-label"),
				btn.getAttribute("title"),
				btn.getAttribute("data-testid"),
				btn.textContent,
			].filter(Boolean).join(" ");
			if (/停止|Stop/i.test(label) && !/发送|Send/i.test(label)) return false;
			if (/发送|Submit|Send(?!\s*feedback)/i.test(label)) return true;
			/* composer 主按钮：data-composer-card 内的 primary */
			try {
				const card = btn.closest("[data-composer-card], [data-composer-seat]");
				if (card) {
					const cls = String(btn.className || "");
					if (/primary/i.test(cls) && btn.querySelector("svg")) return true;
				}
			} catch { /* ignore */ }
			if (btn.type === "submit") {
				const form = btn.closest("form");
				if (form && form.querySelector("textarea, [contenteditable='true']")) return true;
			}
			return false;
		}

		function fetchEnvAdaptStatus() {
			return fetch("/hacker/api", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ op: "platformEnvAdaptStatus" }),
			}).then((r) => r.json()).catch(() => null);
		}

		/** 同步探测的占位：不再做同步 XHR（会卡 UI 主线程、Chrome 已逐步弃用）。
		 * 调用方 mustBlockSubmit 在 cache 过期/缺失时按"未知→保守 block"处理,
		 * 同时 EnvAdaptSendGate 的 useEffect 轮询会异步 refresh,下次调用即可放行。 */
		function fetchEnvAdaptStatusSync() { return null; }

		/** 嘿客发送前门禁：未就绪 → 授权并打开环境适配；可确认跳过。 */
		function EnvAdaptSendGate() {
			const t = useT();
			const [open, setOpen] = useState(false);
			const [confirmSkip, setConfirmSkip] = useState(false);
			const [status, setStatus] = useState(null);
			const [busy, setBusy] = useState(false);
			const cacheRef = useRef({ at: 0, ready: false });
			const openRef = useRef(false);
			openRef.current = open;

			const refresh = useCallback(async () => {
				const r = await fetchEnvAdaptStatus();
				const ready = !!(r && r.ready);
				cacheRef.current = { at: Date.now(), ready: ready, skipped: !!(r && r.skipped) };
				setStatus(r);
				return r;
			}, []);

			const blockAndOpen = useCallback(() => {
				setConfirmSkip(false);
				refresh();
				/* 第一次：只走完整授权窗 → 授权后进环境适配页 */
				/* 已授权过：只弹精简环境适配窗，不再自动拉开整块演练台 */
				setOpen(true);
				return true;
			}, [refresh]);

			const mustBlockSubmit = useCallback(() => {
				if (!isHackerModeActive()) return false;
				const cached = cacheRef.current;
				/* cache 过期时触发异步刷新;本次调用按最后一次 cache 判断,未知保守 block */
				if (!cached.at || Date.now() - cached.at > 2500) {
					refresh().catch(() => {});
				}
				if (cached.ready) return false;
				blockAndOpen();
				return true;
			}, [blockAndOpen, refresh]);

			/* 挂住宿主 SessionInputShell.submit —— 比点按钮启发式可靠。
			 * patch 必须可逆:存 origSubmit 到 WeakMap,unmount / 依赖变更时恢复,
			 * 否则插件禁用后 shell.submit 还是我们的 wrapper,持死 mustBlockSubmit 闭包。 */
			useEffect(() => {
				const patched = new WeakMap();
				const patchedShells = [];
				const patchShell = (shell) => {
					if (!shell || patched.has(shell)) return;
					if (typeof shell.submit !== "function") return;
					const origSubmit = shell.submit;
					patched.set(shell, { origSubmit });
					patchedShells.push(shell);
					const bound = origSubmit.bind(shell);
					shell.submit = function gatedSubmit(mode) {
						try {
							if (mustBlockSubmit()) return;
						} catch { /* 门禁异常时不吞掉发送 */ }
						return bound(mode);
					};
				};
				const tick = () => {
					try {
						const sessions = rewindSessions || (rewindHost && rewindHost.sessions);
						const sid = currentSessionId(sessions);
						if (!sid) return;
						patchShell(conversationInput(sid));
					} catch { /* ignore */ }
				};
				tick();
				const iv = window.setInterval(tick, 400);
				return () => {
					window.clearInterval(iv);
					for (const shell of patchedShells) {
						const info = patched.get(shell);
						if (!info) continue;
						try { shell.submit = info.origSubmit; } catch { /* ignore */ }
					}
					patchedShells.length = 0;
				};
			}, [mustBlockSubmit]);

			useEffect(() => {
				let alive = true;
				const tick = () => {
					if (!alive) return;
					if (!isHackerModeActive()) return;
					refresh();
				};
				tick();
				const iv = window.setInterval(tick, 5000);
				return () => { alive = false; window.clearInterval(iv); };
			}, [refresh]);

			useEffect(() => {
				const onPointer = (e) => {
					if (!looksLikeSendControl(e.target)) return;
					if (!mustBlockSubmit()) return;
					e.preventDefault();
					e.stopPropagation();
					if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
				};
				const onKey = (e) => {
					if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
					const inComposer = e.target && e.target.closest
						&& e.target.closest("[data-composer-card], [data-composer-seat], [contenteditable='true'], textarea");
					if (!inComposer) return;
					if (e.target.closest && e.target.closest(".dshp-dock, .dshp-auth-mask, .rt-dock, .dshp-env-gate")) return;
					if (!mustBlockSubmit()) return;
					e.preventDefault();
					e.stopPropagation();
					if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
				};
				document.addEventListener("pointerdown", onPointer, true);
				document.addEventListener("click", onPointer, true);
				document.addEventListener("keydown", onKey, true);
				return () => {
					document.removeEventListener("pointerdown", onPointer, true);
					document.removeEventListener("click", onPointer, true);
					document.removeEventListener("keydown", onKey, true);
				};
			}, [mustBlockSubmit]);

			if (!open) return null;

			const message = (status && status.message) || t("envGate.lead");
			return h("div", { className: "dshp-auth-mask dshp-env-gate", role: "dialog", "aria-modal": "true" },
				h("div", { className: "dshp-auth-modal", style: { width: "min(480px,100%)" } },
					h("h2", null, t("envGate.title")),
					h("div", { style: { fontSize: 13, lineHeight: 1.55 } }, message),
					h("div", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#999)", lineHeight: 1.5 } }, t("envGate.kaliHint")),
					confirmSkip
						? h("div", { className: "dshp-auth-warn" }, t("envGate.skipConfirm"))
						: null,
					h("div", { className: "dshp-auth-ops" },
						confirmSkip
							? [
								h("button", {
									key: "no",
									type: "button",
									onClick: () => setConfirmSkip(false),
								}, t("envGate.skipNo")),
								h("button", {
									key: "yes",
									type: "button",
									className: "primary",
									disabled: busy,
									onClick: () => {
										setBusy(true);
										fetch("/hacker/api", {
											method: "POST",
											headers: { "content-type": "application/json" },
											body: JSON.stringify({ op: "platformEnvAdaptSkip", skip: true }),
										}).then((r) => r.json()).then((r) => {
											setBusy(false);
											cacheRef.current = { at: Date.now(), ready: true, skipped: true };
											setStatus(r);
											setOpen(false);
											setConfirmSkip(false);
										}).catch(() => {
											setBusy(false);
											cacheRef.current = { at: Date.now(), ready: true, skipped: true };
											setOpen(false);
										});
									},
								}, t("envGate.skipYes")),
							]
							: [
								h("button", {
									key: "skip",
									type: "button",
									onClick: () => setConfirmSkip(true),
								}, t("envGate.skip")),
								h("button", {
									key: "go",
									type: "button",
									className: "primary",
									onClick: () => {
										setOpen(false);
										requestArmorEnv();
									},
								}, t("envGate.go")),
							],
					),
				),
			);
		}

		/**
		 * 破甲规则控件 —— 25 条 Scoped Rules 的分类勾选面板。
		 *
		 * 交互：大类可折叠，展开后逐条勾选；每个大类有自己的全选/全清；
		 * 顶部有全局「全选 / 全清 / 恢复默认」。勾选立即 POST 到
		 * `/本插件/armor/set`，下一轮注入就生效 —— 不需要重启。
		 *
		 * 数据全部来自 Host 的 `/本插件/armor`（`catalogSnapshot`），
		 * 前端不硬编码规则名，改 md 或改目录后界面自动跟上。
		 */
		function ArmorRulesPanel() {
  const lang = useLang();
			const t = useT();
			const [data, setData] = useState(null);
			const [err, setErr] = useState("");
			const [busy, setBusy] = useState(false);
			const [openGroups, setOpenGroups] = useState(() => ({ offense: true }));
			const [saving, setSaving] = useState("");
			// 搜索与强度筛选：25 条摊在 12 个折叠区里，不筛一下找一条很费劲
			const [query, setQuery] = useState("");
			const [level, setLevel] = useState("");

			const load = useCallback(async () => {
				try {
					const d = await apiJson("/ys-pojia/armor/status?locale=" + lang);
					setData(d);
					setErr("");
				} catch (e) {
					setErr(String((e && e.message) || e));
				}
			}, [lang]);

			useEffect(() => { load(); }, [load]);

			const post = useCallback(async (path, body, mark) => {
				setBusy(true);
				setSaving(mark || "");
				try {
					// 提交后后端会把整份目录再发回来，它按 ?locale= 决定语言。
					// 不带 locale 就退回 Accept-Language（浏览器是 zh-CN），返回中文数据，
					// setData 一覆盖，英文界面就变回中文 —— 用户看到的是「点开关语言自己变了」。
					const url = path + (path.indexOf("?") >= 0 ? "&" : "?") + "locale=" + lang;
					const d = await apiJson(url, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(body || {}),
					});
					if (d && d.groups) setData(d);
					setErr("");
					return d;
				} catch (e) {
					setErr(String((e && e.message) || e));
					return null;
				} finally {
					setBusy(false);
					setSaving("");
				}
			}, [lang]);

			const setAll = (mode) => post("/ys-pojia/armor/set", { enabledIds: mode }, "all");
			const reset = () => post("/ys-pojia/armor/reset", {}, "reset");
			const toggleOne = (id, enabled) => post("/ys-pojia/armor/toggle", { id, enabled }, "r" + id);
			const applyPreset = (id) => post("/ys-pojia/armor/preset", { preset: id }, "p" + id);

			const toggleGroup = (g, on) => {
				const ids = (g.rules || []).map((r) => r.id);
				const cur = new Set((data && data.enabledIds) || []);
				for (const id of ids) { if (on) cur.add(id); else cur.delete(id); }
				return post("/ys-pojia/armor/set", { enabledIds: [...cur] }, "g" + g.id);
			};

			const foldGroup = (id) => setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

			if (err && !data) {
				return h("div", { className: "dshp-armor" },
					h("div", { className: "dshp-armor-err" }, t("armor.err") + " " + err),
					h("button", { className: "dshp-btn", onClick: load, type: "button" }, t("armor.retry")));
			}
			if (!data) {
				return h("div", { className: "dshp-armor" },
					h("div", { className: "dshp-armor-loading" }, t("armor.loading")));
			}

			const rawGroups = data.groups || [];
			const enabledCount = data.enabledCount || 0;
			const total = data.total || 0;
			const missing = data.missingIds || [];
			const presets = data.presets || [];
			const levels = data.levels || [];
			const audit = data.audit || null;

			// ── 筛选：搜索词同时匹配 label / short / why / tags ──
			const q = query.trim().toLowerCase();
			const filtering = Boolean(q) || Boolean(level);
			const matchRule = (r) => {
				if (level && r.level !== level) return false;
				if (!q) return true;
				const hay = [r.label, r.labelAlt, r.short, r.why, String(r.id)]
					.concat(r.tags || [])
					.join(" ")
					.toLowerCase();
				return hay.indexOf(q) >= 0;
			};
			const groups = filtering
				? rawGroups
					.map((g) => ({ ...g, rules: (g.rules || []).filter(matchRule) }))
					.filter((g) => g.rules.length > 0)
				: rawGroups;
			const matchedCount = filtering
				? groups.reduce((n, g) => n + g.rules.length, 0)
				: total;
			// 筛选时强制展开，否则命中项藏在折叠区里看不见
			const isOpen = (id) => (filtering ? true : !!openGroups[id]);

			return h("div", { className: "dshp-armor" },
				// ── 头部：计数 + 全局操作 ──
				h("div", { className: "dshp-armor-head" },
					h("div", { className: "dshp-armor-title" },
						h("span", { className: "dshp-armor-name" }, t("armor.title")),
						h("span", { className: "dshp-armor-count" },
							enabledCount + " / " + total + " " + t("armor.enabledUnit"))),
					h("div", { className: "dshp-armor-actions" },
						h("button", {
							type: "button", className: "dshp-btn", disabled: busy,
							onClick: () => setAll("all"),
						}, t("armor.selectAll")),
						h("button", {
							type: "button", className: "dshp-btn", disabled: busy,
							onClick: () => setAll("none"),
						}, t("armor.selectNone")),
						h("button", {
							type: "button", className: "dshp-btn dshp-btn-ghost", disabled: busy,
							onClick: reset,
						}, t("armor.resetDefault")))),

				// ── 预设方案：一键套用常见组合 ──
				presets.length
					? h("div", { className: "dshp-armor-presets" },
						h("span", { className: "dshp-armor-plabel" }, t("armor.presets")),
						presets.map((p) => h("button", {
							key: p.id,
							type: "button",
							className: "dshp-btn dshp-btn-mini dshp-armor-preset" + (p.active ? " on" : ""),
							"data-accent": p.accent || "mute",
							disabled: busy,
							title: p.hint + " · " + p.ids.length + t("unit.items"),
							onClick: () => applyPreset(p.id),
						}, p.label)))
					: null,

				// ── 筛选条 ──
				h("div", { className: "dshp-armor-filter" },
					h("input", {
						type: "search",
						className: "dshp-field dshp-armor-search",
						placeholder: t("armor.search"),
						value: query,
						onChange: (e) => setQuery(e.target.value),
					}),
					levels.length
						? h("select", {
							className: "dshp-field dshp-armor-level",
							value: level,
							onChange: (e) => setLevel(e.target.value),
						},
							h("option", { value: "" }, t("armor.levelAll")),
							levels.map((lv) => h("option", { key: lv.id, value: lv.id },
								t("armor.level." + lv.id) + " · " + lv.hint
								+ (lv.count ? " (" + lv.enabledCount + "/" + lv.count + ")" : ""))))
						: null,
					filtering
						? h("span", { className: "dshp-armor-matched" },
							t("armor.matched").replace("{n}", String(matchedCount)))
						: null,
					filtering
						? h("button", {
							type: "button",
							className: "dshp-btn dshp-btn-mini dshp-btn-ghost",
							onClick: () => { setQuery(""); setLevel(""); },
						}, t("armor.clearFilter"))
						: null),

				// ── 缺失提示：勾了但正文里没有 ──
				missing.length > 0
					? h("div", { className: "dshp-armor-warn" },
						t("armor.missing").replace("{ids}", missing.join(", ")))
					: null,

				// ── 正文结构自检：规则块定位失败 / 编号重复时报警 ──
				audit
					? h("div", { className: "dshp-armor-audit" + (audit.ok ? "" : " bad") },
						audit.ok
							? t("armor.auditOk")
								+ (audit.block
									? " · " + t("armor.auditBlock")
										.replace("{n}", String(audit.block.count))
										.replace("{start}", String(audit.block.start))
										.replace("{end}", String(audit.block.end))
									: "")
							: t("armor.auditBad") + (audit.problems || []).join("；"))
					: null,

				// ── 分类折叠区 ──
				groups.length === 0
					? h("div", { className: "dshp-armor-loading" }, t("armor.searchEmpty"))
					: h("div", { className: "dshp-armor-groups" },
						groups.map((g) => {
							const open = isOpen(g.id);
							const gEnabled = (g.rules || []).filter((r) => r.enabled).length;
							const gTotal = (g.rules || []).length;
							const allOn = gEnabled === gTotal && gTotal > 0;
							return h("div", {
								className: "dshp-armor-group" + (open ? " open" : ""),
								key: g.id,
								"data-tone": g.tone || "mute",
							},
								// 折叠头
								h("div", {
									className: "dshp-armor-ghead",
									onClick: () => foldGroup(g.id),
									role: "button",
									tabIndex: 0,
									onKeyDown: (e) => {
										if (e.key === "Enter" || e.key === " ") { e.preventDefault(); foldGroup(g.id); }
									},
								},
									h("span", { className: "dshp-armor-caret" }, open ? "▾" : "▸"),
									h("span", { className: "dshp-armor-glabel" }, g.label),
									h("span", { className: "dshp-armor-gcount" }, gEnabled + "/" + gTotal),
									h("span", { className: "dshp-armor-ghint" }, g.hint || ""),
									// 组内全选/全清（阻止冒泡，避免连带折叠）
									h("button", {
										type: "button",
										className: "dshp-btn dshp-btn-mini",
										disabled: busy,
										onClick: (e) => { e.stopPropagation(); toggleGroup(g, !allOn); },
									}, allOn ? t("armor.groupClear") : t("armor.groupAll")),
								),
								// 展开体
								open
									? h("div", { className: "dshp-armor-body" },
										(g.rules || []).map((r) => h("label", {
											key: r.id,
											className: "dshp-armor-row" + (r.present ? "" : " absent"),
											title: r.present ? (r.why || r.short) : t("armor.absentHint"),
										},
											h("input", {
												type: "checkbox",
												checked: !!r.enabled,
												disabled: busy || !r.present,
												onChange: (e) => toggleOne(r.id, e.target.checked),
											}),
											h("span", { className: "dshp-armor-id" }, String(r.id)),
											h("span", { className: "dshp-armor-rlabel" }, r.label),
											r.since
												? h("span", { className: "dshp-armor-new", title: "v" + r.since }, t("armor.newBadge"))
												: null,
											r.level
												? h("span", { className: "dshp-armor-lv lv-" + r.level }, t("armor.level." + r.level))
												: null,
											h("span", { className: "dshp-armor-short" }, r.short),
											saving === "r" + r.id ? h("span", { className: "dshp-armor-saving" }, "…") : null,
										)))
									: null,
							);
						})),
			);
		}

		/**
		 * 破甲引擎面板 —— 三档可切换（补丁 / 边界改写 / 纯提示词）。
		 *
		 * 数据全部来自 `/ys-pojia/engine/status`，前端不硬编码引擎名：
		 * 后端加一档，这里自动多一张卡。
		 *
		 * 交互：
		 *  - 点卡片「切换到此档」→ POST /ys-pojia/engine/set，下一轮请求生效
		 *  - 选项开关立即保存，与该档的默认值对比决定显示
		 *  - 「跑一次自检」→ POST /ys-pojia/engine/selftest，逐项列出注入链状态
		 */
		/**
		 * 杂项设定页。
		 *
		 * 全部值来自 `/ys-pojia/misc`；写回也是它。每项写完服务端已落盘并回读，
		 * 这里直接拿返回的 values 覆盖本地状态，所以开关不会跳回去。
		 *
		 * 布局：一张卡片一组，卡片头可折叠。组长收起来时只看组名与项数，
		 * 展开才出现具体条目 —— 项多的时候不至于要往下翻半天。
		 */
		function MiscPanel() {
			const t = useT();
			const [data, setData] = useState(null);
			const [open, setOpen] = useState({ prompt: true, auto: false, tools: false, host: false });
			const [notice, setNotice] = useState({ kind: "idle", text: "" });
			const [busyKey, setBusyKey] = useState("");
			// 模式预设：后端 /ys-pojia/mode 有完整能力，但前端一直没有入口，
			// 用户在界面上根本看不到「下次新建会话用哪个模式」。这里接上。
			const [modeData, setModeData] = useState(null);

			const load = () => {
				apiJson("/ys-pojia/misc")
					.then((d) => {
						if (d && d.ok) {
							setData(d);
							setNotice({ kind: "idle", text: "" });
						} else {
							setNotice({ kind: "error", text: t("misc.loadFail") });
						}
					})
					.catch(() => setNotice({ kind: "error", text: t("misc.loadFail") }));
				// 顺带拉模式列表：失败不影响其他项
				apiJson("/ys-pojia/mode")
				  .then((d) => { if (d && d.ok) setModeData(d); })
				  .catch(() => {});
			};

			// 切换「下次新建会话用哪个模式」。
			// 后端 POST /ys-pojia/mode/switch 一直存在，前端从没接 —— 用户看不到这个开关。
			const switchMode = (id) => {
			  setBusyKey("mode");
			  apiJson("/ys-pojia/mode/switch", {
			    method: "POST",
			    headers: { "content-type": "application/json" },
			    body: JSON.stringify({ mode: id }),
			  })
			    .then((d) => {
			      if (d && d.ok) {
			        setNotice({ kind: "ok", text: t("misc.mode.saved") });
			        load();
			      } else {
			        setNotice({ kind: "error", text: t("misc.mode.fail") });
			      }
			    })
			    .catch(() => setNotice({ kind: "error", text: t("misc.mode.fail") }))
			    .finally(() => setBusyKey(""));
			};

			useEffect(load, []);

			const save = (key, value) => {
				// 只挡同一个 key 的重复提交。早先是 if (busyKey) return，
				// 结果开关 A 还没回来时点开关 B 也会被丢掉，用户以为 B 坏了。
				if (busyKey === key) return;
				setBusyKey(key);
				// 乐观更新：先把界面切过去，失败再回滚成服务端真实值。
				setData((prev) => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));
				apiJson("/ys-pojia/misc", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ key, value }),
				})
					.then((d) => {
						if (d && d.ok) {
							setData((prev) => (prev ? { ...prev, values: d.values, schema: d.schema || prev.schema } : prev));
							setNotice({ kind: "ok", text: t("misc.saved") });
						} else {
							setNotice({ kind: "error", text: (d && d.error) || "save failed" });
							if (d && d.values) setData((prev) => (prev ? { ...prev, values: d.values } : prev));
							else load();
						}
					})
					.catch((e) => {
						setNotice({ kind: "error", text: e.message || "save failed" });
						load();
					})
					.finally(() => setBusyKey(""));
			};

			if (!data) return h("div", { className: "dshp-misc", "aria-busy": "true" },
				// 骨架按真实布局摆：一行标题 + 三张分组卡，视觉上不跳。
				h("div", { className: "dshp-skel", style: { height: 16, width: "38%", marginBottom: 10 } }),
				...[0, 1, 2].map((i) => h("div", { key: i, className: "dshp-misc-card" },
					h("div", { className: "dshp-skel", style: { height: 14, width: (52 - i * 8) + "%", margin: "9px 12px" } }))),
			);
			const values = data.values || {};
			const schema = Array.isArray(data.schema) ? data.schema : [];

			return h("div", { className: "dshp-misc" },
				h("div", { className: "dshp-sub" },
					h("h4", null, t("misc.title")),
					notice.kind === "idle" ? null : noticeNode(notice)),
				h("p", { className: "dshp-hint", style: { margin: "0 0 8px", color: "var(--dshp-mute)", fontSize: 12 } }, t("misc.hint")),
				// 模式预设卡片：后端 /ys-pojia/mode 一直有，前端从没接。
				// 它决定「下次新建会话用哪个模式」，是用户能看到的唯一入口。
				modeData ? h("div", { key: "__mode", className: "dshp-misc-card" },
				  h("button", {
				    type: "button",
				    className: "dshp-misc-h",
				    "aria-expanded": open.mode ? "true" : "false",
				    onClick: () => setOpen((prev) => Object.assign({}, prev, { mode: !prev.mode })),
				  },
				    h("strong", null, t("misc.group.mode")),
				    h("span", { style: { marginLeft: "auto", color: "var(--dshp-mute)", fontSize: 12 } },
				      String(modeData.selected || modeData.current || "未设置")),
				  ),
				  open.mode ? h("div", { style: { padding: "4px 0 0" } },
				    h("p", { className: "dshp-hint", style: { margin: "0 0 8px", color: "var(--dshp-mute)" } },
				      t("misc.mode.hint")),
				    (modeData.modes || []).map((m) => h("div", {
				      key: m.id,
				      className: "dshp-misc-row" + (modeData.selected === m.id ? " is-on" : ""),
				      style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0" },
				    },
				      h("span", { style: { flex: 1 } },
				        h("b", null, m.name || m.id),
				        (m.tagline || m.summary) ? h("span", { style: { color: "var(--dshp-mute)", marginLeft: 6, fontSize: 12 } }, m.tagline || m.summary) : null,
				      ),
				      modeData.selected === m.id
				        ? h("span", { style: { color: "var(--dshp-accent)", fontSize: 12 } }, t("misc.mode.current"))
				        : h("button", {
				            type: "button",
				            className: "dshp-btn",
				            disabled: !!busyKey,
				            onClick: () => switchMode(m.id),
				          }, t("misc.mode.switch")),
				    )),
				  ) : null,
				) : null,
				...schema.map((group) => {
					const items = Array.isArray(group.items) ? group.items : [];
					if (!items.length) return null;
					const onCount = items.filter((it) => values[it.key] === true).length;
					const expanded = !!open[group.id];
					return h("div", { key: group.id, className: "dshp-misc-card" },
						h("button", {
							type: "button",
							className: "dshp-misc-h",
							"aria-expanded": expanded ? "true" : "false",
							onClick: () => setOpen((prev) => Object.assign({}, prev, { [group.id]: !prev[group.id] })),
						},
							h("strong", null, t("misc.group." + group.id)),
							h("span", { className: "dshp-misc-n" }, expanded ? String(items.length) : onCount + "/" + items.length),
						),
						expanded ? h("div", { className: "dshp-misc-body" }, items.map((it) => {
							const v = values[it.key];
							const short = it.key.split(".").slice(1).join(".");
							const label = t("misc." + it.key);
							const desc = t("misc." + it.key + ".d");
							const disabled = busyKey === it.key;
							/* 只读项：后端 miscSchema 带 readOnly。功能可见、开关注顶为开、
							   但点了不改值 —— 给一句提示，而不是静默无反应（静默会被当成坏了）。 */
							const locked = it.readOnly === true;
							// 正在写的这一项：输入框只读但不置灰（置灰会让整行看着像坏了），
							// 开关用忙碌态描边，值已经乐观更新过，所以用户看到的是新状态在等确认。
							const pending = busyKey === it.key;
							let ctl;
							if (it.kind === "bool") {
								ctl = h("button", {
									type: "button",
									className: "dshp-misc-sw" + (v === true ? " on" : "") + (pending ? " busy" : "") + (locked ? " locked" : ""),
									role: "switch",
									"aria-checked": v === true ? "true" : "false",
									"aria-busy": pending ? "true" : "false",
									"aria-disabled": locked ? "true" : "false",
									title: locked ? t("misc.readOnly.tip") : ((v === true ? "on" : "off") + (pending ? " · saving" : "")),
									onClick: () => {
										if (locked) { setNotice({ kind: "warn", text: t("misc.readOnly.tip") }); return; }
										save(it.key, v !== true);
									},
								}, locked ? h("span", { className: "dshp-misc-lock", "aria-hidden": "true" }, "🔒") : null);
							} else if (it.kind === "num") {
								ctl = h("input", {
									type: "number",
									min: it.min == null ? 0 : it.min,
									max: it.max == null ? 20 : it.max,
									value: v == null ? "" : String(v),
									disabled: disabled || locked,
									title: locked ? t("misc.readOnly.tip") : undefined,
									onChange: (e) => save(it.key, Number(e.target.value)),
								});
							} else if (it.kind === "text-long") {
								/* 多行项：人设补充 / 禁止事项这类要写长文的，单行 input 撑不住。
								   和 text 一样走「即时改本地值 + 失焦才落盘」，避免每敲一个字就写盘。 */
								ctl = h("textarea", {
									className: "dshp-misc-ta",
									value: v == null ? "" : String(v),
									disabled: disabled,
									rows: it.rows || 4,
									maxLength: it.maxLen || 8000,
									spellCheck: false,
									onChange: (e) => {
										const next = e.target.value;
										setData((prev) => (prev ? { ...prev, values: { ...prev.values, [it.key]: next } } : prev));
									},
									onBlur: (e) => save(it.key, e.target.value),
								});
							} else {
								ctl = h("input", {
									type: "text",
									value: v == null ? "" : String(v),
									disabled: disabled,
									maxLength: it.maxLen || 200,
									onChange: (e) => {
										const next = e.target.value;
										setData((prev) => (prev ? { ...prev, values: { ...prev.values, [it.key]: next } } : prev));
									},
									onBlur: (e) => save(it.key, e.target.value),
									onKeyDown: (e) => { if (e.key === "Enter") e.currentTarget.blur(); },
								});
							}
							return h("div", { key: it.key, className: "dshp-misc-row" + (pending ? " is-busy" : "") + (locked ? " locked" : "") },
								h("div", { className: "dshp-misc-lbl" },
									h("div", { className: "dshp-misc-t" },
										label,
										it.key.startsWith("auto.") ? h("span", { className: "dshp-misc-tag" }, short) : null),
									desc && desc !== "misc." + it.key + ".d"
										? h("div", { className: "dshp-misc-d" }, desc)
										: null),
								h("div", { className: "dshp-misc-ctl" }, ctl));
						})) : null,
					);
				}),
			);
		}

		/**
		 * 三模式选择区（嘿客 / 无限制 / 创世神）。
		 *
		 * 和下面的「引擎三档」是两回事，这里必须讲清楚，否则用户会混：
		 *   模式 = 宿主的 agent preset，决定这次会话挂哪些插件、用哪份人设。
		 *          在**新建会话**那一刻固化，改不了当前会话。
		 *   引擎 = 破甲的方法（补丁 / 边界改写 / 纯提示词）。插件自己的状态，
		 *          点了立刻对下一轮请求生效。
		 *
		 * 所以本组件把「当前会话用的模式」和「新建会话将用的模式」分开显示，
		 * 并且切换后明确提示要新建会话才生效——不假装能热切。
		 */

		function modeNameOf(modes, id) {
			const hit = (modes || []).find((m) => m && m.id === id);
			return hit ? hit.name : "";
		}

		function EnginePanel() {
  const lang = useLang();
			const t = useT();
			const [data, setData] = useState(null);
			const [err, setErr] = useState("");
			const [busy, setBusy] = useState("");
			const [report, setReport] = useState(null);
			/* 被锁功能的点击提示。不静默忽略：用户点了必须知道为什么点不动、
			   以及怎么解锁。 */
			const [notice, setNotice] = useState(null);
			const showCapNotice = useCallback((label, reason) => {
				setNotice({ label: String(label || ""), reason: String(reason || "") });
			}, []);

			const load = useCallback(async () => {
				try {
					const d = await apiJson("/ys-pojia/engine/status?locale=" + currentLang);
					setData(d);
					setErr("");
				} catch (e) {
					setErr(String((e && e.message) || e));
				}
			}, [lang]);

			useEffect(() => { load(); }, [load]);

			const post = useCallback(async (path, body) => {
				setBusy(path);
				try {
					// 自检报告由后端生成，文案按 ?locale= 决定；不带就退回 Accept-Language，
					// 中文浏览器会拿到整份中文报告，英文界面下看着像没翻译。
					const url = path + (path.indexOf("?") >= 0 ? "&" : "?") + "locale=" + lang;
					const d = await apiJson(url, {
      method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(body || {}),
					});
					setErr("");
					return d;
				} catch (e) {
					setErr(String((e && e.message) || e));
					return null;
				} finally {
					setBusy("");
				}
			}, [lang]);

			/* 分段控件只改草稿，不落盘。用户按下「应用」才真正 POST 到 /engine/set。 */
			const [draft, setDraft] = useState(null);
			const [draftOpts, setDraftOpts] = useState(null);
			/* 破甲档位（core / stealth / redteam-max / ctf-x）。独立于引擎档：
			   profile 管「注入哪份 overlay」，engine 管「注入走哪条通道」。 */
			const [profData, setProfData] = useState(null);
			const [profBusy, setProfBusy] = useState("");
			const [profErr, setProfErr] = useState("");

			const loadProfile = useCallback(async () => {
				try {
					const d = await apiJson("/ys-pojia/profile");
					if (d && d.ok) { setProfData(d); setProfErr(""); }
				} catch { /* 档位接口不可用时整卡隐藏，不影响引擎面板 */ }
			}, []);

			useEffect(() => { loadProfile(); }, [loadProfile]);

			const switchProfile = async (id) => {
				setProfBusy(id);
				try {
					const d = await apiJson("/ys-pojia/profile", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ id }),
					});
					if (d && d.ok) { setProfData(d); setProfErr(""); }
					else setProfErr((d && d.error) || "切换失败");
				} catch (e) {
					setProfErr(String((e && e.message) || e));
				} finally {
					setProfBusy("");
				}
			};

			const shown = draft || (data && data.engine);
			const dirty = Boolean(data && (
				(draft && draft !== data.engine)
				|| (draftOpts && JSON.stringify(draftOpts) !== JSON.stringify(data.options || {}))
			));
			const discard = () => { setDraft(null); setDraftOpts(null); };
			const commit = async () => {
				if (!data) return;
				const target = draft || data.engine;
				const nextOpts = draftOpts || data.options || {};
				setBusy("/ys-pojia/engine/apply");
				try {
					const d = await apiJson("/ys-pojia/engine/set?locale=" + currentLang, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ engine: target, options: nextOpts }),
					});
					setErr("");
					if (d && d.engines) {
						setData(d);
						setReport(null);
						discard();
					}
				} catch (e) {
					setErr(String((e && e.message) || e));
				} finally {
					setBusy("");
				}
			};

			/* 选项也只改草稿，跟分段控件一起等「应用」。 */
			const flipOption = (key, value) => {
				if (!data) return;
				const opts = Object.assign({}, draftOpts || data.options || {});
				opts[key] = value;
				setDraftOpts(opts);
			};

			/*
			 * 消息层清洗强度：二选一。
			 *
			 * 强制模式额外联动 prefill —— 这是「干预生成」那一半：
			 * 历史清洗解决「模型有样学样」，预填充解决「模型开口第一句就是拒绝」。
			 * 两者一起才叫强制清洗。
			 */
			const setCleanMode = (mode) => {
			  if (!data) return;
			  const opts = Object.assign({}, draftOpts || data.options || {});
			  opts.forceClean = mode === "forced";
			  opts.prefill = mode === "forced";
			  setDraftOpts(opts);
			};

			const selftest = async () => {
				const d = await post("/ys-pojia/engine/selftest", {});
				if (d && d.report) setReport(d.report);
			};

			if (err && !data) {
				return h("div", { className: "dshp-armor" },
					h("div", { className: "dshp-armor-err" }, t("engine.err") + " " + err),
					h("button", { className: "dshp-btn", onClick: load, type: "button" }, t("engine.retry")));
			}
			if (!data) {
				return h("div", { className: "dshp-armor" },
					h("div", { className: "dshp-armor-loading" }, t("engine.loading")));
			}

			const engines = data.engines || [];
			const availability = data.availability || {};
			const active = data.engine;
			const opts = draftOpts || data.options || {};
			const probe = data.probe || {};
			const reasons = data.reasons || [];

			const stateLabel = (s) => t("engine.state." + (s || "available"));

			return h("div", { className: "dshp-armor" },
				// ── 头部 ──
				h("div", { className: "dshp-armor-head" },
					h("div", { className: "dshp-armor-title" },
						h("span", { className: "dshp-armor-name" }, t("engine.title")),
						h("span", { className: "dshp-armor-count" }, t("engine.current") + " · " + active)),
					h("div", { className: "dshp-armor-actions" },
						h("button", {
							type: "button",
							className: "dshp-btn" + (busy === "/ys-pojia/engine/selftest" ? " busy" : ""),
							disabled: !!busy,
							"aria-busy": busy === "/ys-pojia/engine/selftest" ? "true" : "false",
							onClick: selftest,
						}, busy === "/ys-pojia/engine/selftest"
							? h("span", { className: "dshp-btn-loading" },
								h("i", { className: "dshp-spin" }), t("engine.selftest.running"))
							: t("engine.selftest.run")))),
				h("div", { className: "dshp-armor-sum" }, t("engine.lead")),

// ── 破甲档位卡（profile overlay 热切换）──
// 当前档 + ACTIVE 徽标 + 单选行。点行立即 POST /profile，
// overlay dispose→重注册，下一次模型调用生效，无需重启。
				profData && Array.isArray(profData.profiles) && profData.profiles.length
					? h("div", { className: "dshp-prof" },
						h("div", { className: "dshp-prof-cur" },
							h("div", { className: "dshp-prof-currow" },
								h("span", { className: "dshp-prof-label" }, "当前档位"),
								h("span", { className: "dshp-prof-active" }, "ACTIVE")),
							h("div", { className: "dshp-prof-currow2" },
								h("span", { className: "dshp-prof-name" },
									(profData.profiles.find((p) => p.active) || {}).name || profData.activeId),
								h("span", { className: "dshp-prof-id" }, profData.activeId)),
							h("div", { className: "dshp-prof-desc" },
								(profData.profiles.find((p) => p.active) || {}).desc || "")),
						h("div", { className: "dshp-prof-rows" },
							profData.profiles.map((p) => {
								const isActive = p.active;
								const pending = profBusy === p.id;
								return h("button", {
									key: p.id,
									type: "button",
									className: "dshp-prof-row" + (isActive ? " on" : ""),
									disabled: isActive || !!profBusy,
									onClick: () => { if (!isActive && !profBusy) switchProfile(p.id); },
								},
									h("span", { className: "dshp-prof-radio" + (isActive ? " on" : "") },
										isActive ? h("span", { className: "dshp-prof-dot" }) : null),
									h("span", { className: "dshp-prof-main" },
										h("span", { className: "dshp-prof-nrow" },
											h("span", { className: "dshp-prof-nm" }, p.name),
											h("span", { className: "dshp-prof-pid" }, p.id)),
										h("span", { className: "dshp-prof-pdesc" }, p.desc || p.tag || "")),
									h("span", { className: "dshp-prof-act" + (isActive ? " on" : "") },
										pending ? "切换中…" : isActive ? "当前" : "切换"));
							})),
						profErr ? h("div", { className: "dshp-prof-err" }, profErr) : null)
					: null,

// ── 自检结果 ──
// 紧跟在按钮下方：用户点完「跑一次自检」视线就在顶部，
// 结果如果压在最底部，得先下滑一屏才看得见，等于没反馈。
				report
					? h("div", { className: "dshp-eng-report" + (report.ok ? " ok" : " bad") },
						h("div", { className: "dshp-eng-rhead" },
							report.ok
								? t("engine.selftest.ok")
								: t("engine.selftest.fail").replace("{keys}", (report.failedKeys || []).join(", "))),
						h("div", { className: "dshp-eng-bytes" },
							t("engine.selftest.bytes")
								.replace("{raw}", String((report.bytes || {}).raw || 0))
								.replace("{filtered}", String((report.bytes || {}).filtered || 0))
								.replace("{seed}", String((report.bytes || {}).seed || 0))),
						(report.steps || []).map((s) => h("div", { key: s.key, className: "dshp-eng-step" },
							h("span", { className: "dshp-eng-mark" + (s.ok ? " ok" : " bad") }, s.ok ? "✓" : "✗"),
							h("span", { className: "dshp-eng-sl" }, s.label),
							h("span", { className: "dshp-eng-sd" }, s.detail))))
					: null,

				// ── 自动降级提示 ──
				data.fellBack
					? h("div", { className: "dshp-armor-warn" },
						t("engine.fellBack")
							.replace("{from}", String(data.fellBackFrom || ""))
							.replace("{reason}", String(data.fellBackReason || "")))
					: null,

				// ── 引擎切换：顶部横向分段控件 ──
				// 点选只改草稿（draft），不动真实档位。必须按「应用」才落盘，
				// 避免误点一下就把引擎切了、还得再切回来。
				h("div", { className: "dshp-eng-seg" + (busy ? " busy" : "") },
					engines.map((e) => {
						const av = availability[e.id] || { state: "available", reasons: [] };
						const isActive = e.id === active;
						const isDraft = e.id === shown;
						const dead = av.state === "unavailable";
						const changed = isDraft && e.id !== active;
						return h("button", {
							key: e.id,
							type: "button",
							className: "dshp-eng-segb"
								+ (isDraft ? " on" : "")
								+ (changed ? " draft" : "")
								+ (dead ? " dead" : "")
								+ (busy === e.id ? " pending" : ""),
							disabled: !!busy || dead,
							"aria-busy": busy === e.id ? "true" : "false",
							"aria-pressed": isDraft ? "true" : "false",
							title: dead ? (av.reasons || []).join("；") : (e.tagline || ""),
							onClick: () => { if (!dead && !busy) setDraft(e.id); },
						},
							h("span", { className: "dshp-eng-segt" }, "T" + e.tier),
							h("span", { className: "dshp-eng-segn" }, e.label),
							changed
								? h("span", { className: "dshp-eng-segs draft" }, t("engine.unapplied"))
								: (isDraft && e.id === active
									? h("span", { className: "dshp-eng-segs" }, t("engine.inUse"))
									: null),
						);
					})),
					/* ── 消息层清洗强度：紧跟引擎切换，左右两键 ── */
					h("div", { className: "dshp-clean" },
					  h("div", { className: "dshp-clean-head" },
					    h("span", { className: "dshp-clean-title" }, t("engine.clean.title")),
					    opts.forceClean ? h("span", { className: "dshp-clean-badge" }, t("engine.clean.on")) : null,
					  ),
					  h("p", { className: "dshp-clean-lead" }, t("engine.clean.lead")),
					  h("div", { className: "dshp-clean-opts" },
					    ["normal", "forced"].map((mode) => {
					      const active = mode === "forced" ? !!opts.forceClean : !opts.forceClean;
					      return h("button", {
					        key: mode,
					        type: "button",
					        className: "dshp-clean-opt" + (active ? " on" : ""),
					        disabled: !!busy,
					        onClick: () => setCleanMode(mode),
					      },
					        h("span", { className: "dshp-clean-n" }, t("engine.clean." + mode)),
					        h("span", { className: "dshp-clean-d" }, t("engine.clean." + mode + ".d")),
					      );
					    }),
					  ),
					  opts.forceClean ? h("p", { className: "dshp-clean-warn" }, t("engine.clean.warn")) : null,
					),

				// ── 应用栏：有改动才出现 ──
				dirty
					? h("div", { className: "dshp-eng-applybar" },
						h("span", { className: "dshp-eng-applynote" },
							t("engine.applyNote")
								.replace("{from}", String(active))
								.replace("{to}", String(shown))),
						h("span", { style: { flex: 1 } }),
						h("button", {
							type: "button",
							className: "dshp-btn ghost",
							disabled: !!busy,
							onClick: discard,
						}, t("engine.discard")),
						h("button", {
							type: "button",
							className: "dshp-btn primary" + (busy === "/ys-pojia/engine/apply" ? " busy" : ""),
							disabled: !!busy,
							"aria-busy": busy === "/ys-pojia/engine/apply" ? "true" : "false",
							onClick: commit,
						}, busy === "/ys-pojia/engine/apply"
							? h("span", { className: "dshp-btn-loading" },
								h("i", { className: "dshp-spin" }), t("engine.applying"))
							: t("engine.apply")))
					: null,

				// ── 当前引擎详情（只渲染选中的一档）──
				engines.filter((e) => e.id === shown).map((e) => {
					const av = availability[e.id] || { state: "available", reasons: [] };
					return h("div", { key: e.id, className: "dshp-eng-card on" },
						h("div", { className: "dshp-eng-head" },
							h("span", { className: "dshp-eng-tier" }, "T" + e.tier),
							h("span", { className: "dshp-eng-name" }, e.label),
							h("span", {
								className: "dshp-eng-state s-" + (av.state || "available"),
							}, stateLabel(av.state)),
							h("span", { style: { flex: 1 } }),
							h("span", { className: "dshp-eng-on" }, t("engine.selected"))),
						h("div", { className: "dshp-eng-tag" }, e.tagline || ""),
						h("div", { className: "dshp-eng-sum" }, e.summary || ""),
						h("div", { className: "dshp-eng-flags" },
							h("span", { className: "dshp-eng-flag" },
								t("engine.touchesHost") + ": " + (e.touchesHost ? t("engine.yes") : t("engine.no"))),
							h("span", { className: "dshp-eng-flag" },
								t("engine.needsRestart") + ": " + (e.needsRestart ? t("engine.yes") : t("engine.no"))),
								h("span", { className: "dshp-eng-flag" + (e.degradation && e.degradation.affectsReasoning ? " warn" : ""), title: e.degradation ? e.degradation.note : "" },
									t("engine.degradation") + ": " + (e.degradation ? e.degradation.label : "—"))),
						h("div", { className: "dshp-eng-cols" },
							h("div", { className: "dshp-eng-col" },
								h("div", { className: "dshp-eng-ch" }, t("engine.pros")),
								h("ul", { className: "dshp-eng-ul" },
									(e.pros || []).map((p, i) => h("li", { key: i }, p)))),
							h("div", { className: "dshp-eng-col" },
								h("div", { className: "dshp-eng-ch bad" }, t("engine.cons")),
								h("ul", { className: "dshp-eng-ul" },
									(e.cons || []).map((p, i) => h("li", { key: i }, p))))),
						e.bestFor
							? h("div", { className: "dshp-eng-best" }, t("engine.bestFor") + " · " + e.bestFor)
							: null,
						(av.reasons || []).length
							? h("div", { className: "dshp-eng-note" }, av.reasons.join("；"))
							: null,
					);
				}),

				// ── 能力矩阵：当前档位哪些功能可用、哪些被锁 ──
				// 引擎档位决定能力上限。锁住的功能不是"坏了"，是这个档位做不到，
				// 所以必须点得动、点了给出原因和解锁办法，而不是灰着不给反馈。
				h("div", { className: "dshp-armor-sub" }, t("engine.caps")),
				h("div", { className: "dshp-caps" },
					(() => {
						const meta = data.features || {};
						const cur = (engines.find((e) => e.id === shown) || {}).features || {};
						const keys = Object.keys(meta);
						return keys.map((key) => {
							const m = meta[key] || {};
							const label = m.label || key;
							const desc = m.desc || "";
							// 后端已经按 locale pick 过 lockedReason（英文界面拿到的就是英文），
							// 这里不要再判一次语言 —— 前端再判一遍，一旦 lang 和实际渲染的语言有偏差
							// 就会出现「切了开关语言跟着变」的错乱。
							const reason = meta.lockedReason || "";
							const usable = cur[key] === true;
							// 有 reason 才代表"这档确实不支持"；没有 reason 的键只是信息性开关
							const lockable = !usable && !!reason;
							return h("button", {
								key,
								type: "button",
								className: "dshp-cap" + (usable ? " on" : " off") + (lockable ? " locked" : ""),
								title: usable ? desc : (lockable ? reason : desc),
								onClick: () => {
									if (lockable) { showCapNotice(label, reason); return; }
								},
							},
								h("i", { className: "dshp-cap-dot" }),
								h("span", { className: "dshp-cap-l" }, label),
								usable ? null : h("span", { className: "dshp-cap-lock" }, "🔒"));
						});
					})()),

				// ── 选项 ──
				h("div", { className: "dshp-armor-sub" }, t("engine.options")),
				h("div", { className: "dshp-eng-opts" },
					(data.optionKeys || []).map((key) => {
						const optLabel = t("engine.opt." + key);
						const hint = t("engine.opt." + key + ".hint");
						const optShown = optLabel !== "engine.opt." + key ? optLabel : key;
						const hintShown = hint !== "engine.opt." + key + ".hint" ? hint : "";
						// 该选项依赖的能力在当前档位不可用时，锁住它并给出原因。
						// 注意这里要用外层 `shown`（引擎 id）去查，不能被选项标签的
						// 局部变量遮住 —— 之前就是用本地化标签去 engines.find()，
						// 永远查不到，锁定逻辑整段失效。
						const meta = (data.features || {})[key] || {};
						const cur = (engines.find((e) => e.id === shown) || {}).features || {};
						const off = cur[key] === false && !!meta.lockedReason;
						const reason = meta.lockedReason || "";
						const remembered = Array.isArray(data.explicitKeys) && data.explicitKeys.includes(key);
						return h("label", {
							key,
							className: "dshp-eng-opt" + (off ? " locked" : ""),
							title: off ? reason : hintShown,
							onClick: off ? (ev) => { ev.preventDefault(); showCapNotice(optShown, reason); } : undefined,
						},
							h("input", {
								type: "checkbox",
								checked: !!opts[key],
								disabled: !!busy || off,
								onChange: (ev) => flipOption(key, ev.target.checked),
							}),
							h("span", { className: "dshp-eng-optl" }, optShown),
							remembered ? h("span", { className: "dshp-eng-optm", title: t("engine.opt.remembered.hint") }, t("engine.opt.remembered")) : null,
							h("span", { className: "dshp-eng-opth" }, off ? "🔒 " + t("engine.locked") : hintShown));
					})),


				// ── 环境提示 ──
				reasons.length
					? h("div", { className: "dshp-armor-sub" }, t("engine.reasons"))
					: null,
				reasons.length
					? h("ul", { className: "dshp-eng-ul dshp-eng-notes" },
						reasons.map((r, i) => h("li", { key: i }, r)))
					: null,


				// ── 环境探测 ──
				h("div", { className: "dshp-armor-sub" }, t("engine.probe")),
				h("div", { className: "dshp-eng-probe" }, [
              // 注入策略：补丁层（改宿主源码）/ 配置层（改宿主配置）/ 纯提示词。
              // 密封宿主上补丁无处落笔，这里如实告诉用户当前能做什么，
              // 不留「显示可用、实际没做」的错觉。
              data.strategy
                ? h("div", { key: "strategy", className: "dshp-eng-prow" }, [
                    h("span", { key: "l" }, t("engine.probe.strategy")),
                    h("code", { key: "v", title: data.strategyReason || "" },
                      t("engine.strategy." + data.strategy)
                      + (data.sealed ? " · " + t("engine.strategy.sealed") : "")),
                  ])
                : null,
				  h("div", { key: "base", className: "dshp-eng-prow" }, [
				    h("span", { key: "l" }, t("engine.probe.aiBase")),
				    h("code", { key: "v" }, probe.aiBase || "—"),
				  ]),
				  h("div", { key: "ver", className: "dshp-eng-prow" }, [
				    h("span", { key: "l" }, t("engine.probe.hostVersion")),
				    h("code", { key: "v" }, probe.hostVersion || "—"),
				  ]),
				  h("div", { key: "pat", className: "dshp-eng-prow" }, [
				    h("span", { key: "l" }, t("engine.probe.patches")),
				    h("code", { key: "v" }, String(probe.patchesApplied || 0) + " / " + String(probe.patchesTotal || 0)),
				  ]),
				  // 逐补丁命中诊断：跨版本时告诉用户「96 条里还能打几条」
				  probe.patchDiag ? h("div", { key: "diag", className: "dshp-eng-prow" }, [
				    h("span", { key: "l" }, t("engine.probe.diagnose")),
				    h("code", { key: "v", className: "dshp-diag-" + ((probe.patchDiag.hit + probe.patchDiag.match) >= probe.patchDiag.total * 0.8 ? "ok" : (probe.patchDiag.hit + probe.patchDiag.match) >= probe.patchDiag.total * 0.5 ? "mid" : "low") },
				      (probe.patchDiag.hit + probe.patchDiag.match) + " / " + probe.patchDiag.total),
				  ]) : null,
				  // 版本级别：exact 已验证 / minor 同系列未逐一验证 / unknown 跨版本
				  probe.hostLevel ? h("div", { key: "lv", className: "dshp-eng-prow" }, [
				    h("span", { key: "l" }, t("engine.probe.level")),
				    h("code", { key: "v", className: "dshp-lv-" + probe.hostLevel },
				      probe.hostLevel === "exact" ? t("engine.level.exact") : (probe.hostLevel === "minor" ? t("engine.level.minor") : t("engine.level.unknown"))),
				  ]) : null,
				]),

				err ? h("div", { className: "dshp-armor-err" }, t("engine.saveFail") + " " + err) : null,

				// ── 锁定功能点击提示 ──
				// 不挡住整个面板，点遮罩或「知道了」关掉。
				notice
					? h("div", {
						className: "dshp-cap-mask",
						onClick: () => setNotice(null),
						role: "dialog",
						"aria-modal": "true",
					},
						h("div", { className: "dshp-cap-modal", onClick: (ev) => ev.stopPropagation() },
							h("div", { className: "dshp-cap-mhead" },
								h("span", { className: "dshp-cap-mlock" }, "🔒"),
								h("span", { className: "dshp-cap-mtitle" }, notice.label)),
							h("div", { className: "dshp-cap-mbody" }, notice.reason),
							h("div", { className: "dshp-cap-mfoot" },
								h("button", {
									type: "button",
									className: "dshp-btn",
									onClick: () => setNotice(null),
								}, t("engine.cap.gotIt")))))
					: null,
			);
		}

		function PurgeDock() {
  const lang = useLang();
			const t = useT();
			const st = useDock();
  // 版本号从后端取一次就够，不用轮询：插件升级要重启宿主，
  // 进程活着的时候版本不会变。
  const [ver, setVer] = useState("");
  useEffect(() => {
    let cancelled = false;
    apiJson("/ys-pojia/status")
      .then((d) => { if (!cancelled && d && d.plugin_version) setVer(String(d.plugin_version)); })
      .catch(() => { /* 取不到就不显示，不占位 */ });
    return () => { cancelled = true; };
  }, []);
			const [geom, setGeom] = useState(() => loadDockGeom());
			const [dockTheme, setDockTheme] = useState(detectHostTheme);
			useEffect(() => {
				const sync = () => setDockTheme(detectHostTheme());
				sync();
				const obs = new MutationObserver(sync);
				if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
				obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
				const timer = window.setInterval(sync, 1500);
				return () => { obs.disconnect(); window.clearInterval(timer); };
			}, []);
			useEffect(() => {
				let uiTag = document.querySelector('style[data-ys-pojia-ui="1"]');
				if (!uiTag) {
					uiTag = document.createElement("style");
					uiTag.setAttribute("data-ys-pojia-ui", "1");
					uiTag.textContent = PURGE_CSS;
					document.head.append(uiTag);
				}
				const styleTag = document.createElement("style");
				styleTag.setAttribute("data-ys-pojia-ui", "1");
				document.head.append(styleTag);
				const widthTag = document.createElement("style");
				widthTag.setAttribute("data-ys-pojia-dock-w", "1");
				widthTag.textContent = ":root{--dshp-dock-w:" + geom.w + "px;--dshp-dock-h:" + geom.h + "px}";
				document.head.append(widthTag);
				return () => { styleTag.remove(); widthTag.remove(); };
			}, []);
			useEffect(() => {
				saveDockGeom(geom);
				const tag = document.querySelector('style[data-ys-pojia-dock-w="1"]');
				if (tag) tag.textContent = ":root{--dshp-dock-w:" + geom.w + "px;--dshp-dock-h:" + geom.h + "px}";
			}, [geom]);
			useEffect(() => {
				const onResize = () => setGeom((g) => clampDockGeom(g));
				window.addEventListener("resize", onResize);
				return () => window.removeEventListener("resize", onResize);
			}, []);
			/* 演练台页面已按需求移除：dock 只保留「清洗」与「破甲」两页。
			   后端 lib/hacker 仍被 lib/index.js 引用（子代理角色捕获），因此只摘 UI 入口。 */
			// 白名单而不是 if 链：早先写成三个 if + 兜底 setDock("clean")，
			// 结果点了「杂项」直接掉进兜底，页面永远切不过去（misc 恒等于 clean）。
			// 以后再加页签也不会重犯——加 id 进集合即可。
  const DOCK_TAB_IDS = new Set(["clean", "rules", "armor", "engine", "misc"]);
			const onTab = (id) => {
				setDock({ tab: DOCK_TAB_IDS.has(id) ? id : "clean", authOpen: false, pending: "tab" });
			};
			const startDrag = (e) => {
				if (e.button !== 0) return;
				if (e.target && e.target.closest && e.target.closest("button,a,input,select,textarea,label")) return;
				e.preventDefault();
				const sx = e.clientX;
				const sy = e.clientY;
				const ox = geom.x;
				const oy = geom.y;
				const move = (ev) => setGeom((g) => clampDockGeom({ x: ox + (ev.clientX - sx), y: oy + (ev.clientY - sy), w: g.w, h: g.h }));
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const startResize = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				const sx = e.clientX;
				const sy = e.clientY;
				const ow = geom.w;
				const oh = geom.h;
				const move = (ev) => setGeom((g) => clampDockGeom({ x: g.x, y: g.y, w: ow + (ev.clientX - sx), h: oh + (ev.clientY - sy) }));
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const startResizeLeft = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				const sx = e.clientX;
				const ox = geom.x;
				const ow = geom.w;
				const move = (ev) => {
					const dx = ev.clientX - sx;
					setGeom((g) => clampDockGeom({ x: ox + dx, y: g.y, w: ow - dx, h: g.h }));
				};
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const startResizeRight = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				const sx = e.clientX;
				const ow = geom.w;
				const move = (ev) => setGeom((g) => clampDockGeom({ x: g.x, y: g.y, w: ow + (ev.clientX - sx), h: g.h }));
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const startResizeBottom = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				const sy = e.clientY;
				const oh = geom.h;
				const move = (ev) => setGeom((g) => clampDockGeom({ x: g.x, y: g.y, w: g.w, h: oh + (ev.clientY - sy) }));
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const body = st.tab === "rules"
				? h("div", { className: "dshp-root", style: { padding: 12 } }, h(RulesSection, null))
				: (st.tab === "armor"
					? h("div", { className: "dshp-root", style: { padding: 12 } }, h(ArmorRulesPanel, null))
					: (st.tab === "engine"
						? h("div", { className: "dshp-root", style: { padding: 12 } }, h(EnginePanel, null))
						: (st.tab === "misc"
							? h("div", { className: "dshp-root", style: { padding: 12 } }, h(MiscPanel, null))
							: h(SettingsRoot, { t }))));
			const panel = h("div", {
				className: "dshp-dock",
				"data-theme": dockTheme === "white" ? "white" : "dusk",
				"data-open": st.open ? "1" : "0",
				style: {
					left: geom.x + "px",
					top: geom.y + "px",
					right: "auto",
					bottom: "auto",
					width: geom.w + "px",
					height: geom.h + "px",
				},
			},
				h("div", { className: "dshp-dock-head", onMouseDown: startDrag, title: "Drag to move the panel" },
					h("b", null, "YS pojia"),
					// 版本号跟在标题后面，小字灰调。取不到就整个不渲染 ——
					// 空壳占位比没有更难看。
					ver ? h("span", { className: "dshp-dock-ver", title: "ys-pojia v" + ver }, "v" + ver) : null,
					// 中英切换。默认英文，点过之后写 localStorage，下次打开保持。
					// 放在标题右边而不是塞进页签栏：页签是「看哪一页」，语言是「整块界面」，
					// 两者层级不同，混在一起会让页签栏越挤越乱。
					h("button", {
					  type: "button",
					  className: "dshp-lang-btn",
					  title: lang === "zh" ? t("dock.lang.toEn") : t("dock.lang.toZh"),
					  "aria-label": lang === "zh" ? t("dock.lang.toEn") : t("dock.lang.toZh"),
					  onMouseDown: (ev) => ev.stopPropagation(),
					  onClick: () => setUiLang(lang === "zh" ? "en" : "zh"),
					}, lang === "zh" ? "EN" : "中文"),
					h("span", { style: { flex: 1 } }),
					h("button", { type: "button", onClick: () => setDock({ open: false, authOpen: false, tab: "clean", pending: "tab" }) }, t("dock.close")),
				),
				h("div", { className: "dshp-dock-tabs", role: "tablist" },
					h("button", {
						type: "button",
						className: "dshp-dock-tab" + (st.tab === "clean" ? " on" : ""),
						role: "tab",
						"aria-selected": st.tab === "clean" ? "true" : "false",
						onClick: () => onTab("clean"),
					}, t("dock.clean")),
					h("button", {
						type: "button",
						className: "dshp-dock-tab" + (st.tab === "rules" ? " on" : ""),
						role: "tab",
						"aria-selected": st.tab === "rules" ? "true" : "false",
						onClick: () => onTab("rules"),
					}, t("dock.rules")),
					h("button", {
						type: "button",
						className: "dshp-dock-tab" + (st.tab === "armor" ? " on" : ""),
						role: "tab",
						"aria-selected": st.tab === "armor" ? "true" : "false",
						onClick: () => onTab("armor"),
					}, t("dock.armor")),
					h("button", {
						type: "button",
						className: "dshp-dock-tab" + (st.tab === "engine" ? " on" : ""),
						role: "tab",
						"aria-selected": st.tab === "engine" ? "true" : "false",
						onClick: () => onTab("engine"),
					}, t("dock.engine")),
					h("button", {
						type: "button",
						className: "dshp-dock-tab" + (st.tab === "misc" ? " on" : ""),
						role: "tab",
						"aria-selected": st.tab === "misc" ? "true" : "false",
						onClick: () => onTab("misc"),
					}, t("dock.misc")),
				),
				h("div", { className: "dshp-dock-body" }, body),
				h("div", { className: "dshp-dock-resize-l", title: "Drag to resize width", onMouseDown: startResizeLeft }),
				h("div", { className: "dshp-dock-resize-r", title: "Drag to resize width", onMouseDown: startResizeRight }),
				h("div", { className: "dshp-dock-resize-b", title: "Drag to resize height", onMouseDown: startResizeBottom }),
				h("div", { className: "dshp-dock-resize", title: "Drag to resize", onMouseDown: startResize }),
			);
			let portal = null;
			let authPortal = null;
			const authNode = st.authOpen ? h(AuthGate, { pending: st.pending }) : null;
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function" && typeof document !== "undefined" && document.body) {
					portal = rd.createPortal(panel, document.body);
					if (authNode) authPortal = rd.createPortal(authNode, document.body);
				}
			} catch { /* host 可能没暴露 react-dom */ }
			return h(react.Fragment, null,
				portal || panel,
				authPortal || authNode,
			);
		}

		function isAutoPushedFlexChild(el) {
			if (!el || el.nodeType !== 1) return false;
			if (/heroOptions/i.test(String(el.className || ""))) return true;
			try {
				return window.getComputedStyle(el).marginLeft === "auto";
			} catch {
				return false;
			}
		}

		/** 跟在工作区/模式后面；不要落到 heroOptions（margin-left:auto）后面，否则新建会话会把芯片甩到行尾。 */
		function placeHeroChip(row, el) {
			if (!row || !el) return;
			let auto = null;
			for (let i = 0; i < row.children.length; i += 1) {
				const kid = row.children[i];
				if (kid !== el && isAutoPushedFlexChild(kid)) {
					auto = kid;
					break;
				}
			}
			if (auto) {
				if (el.nextElementSibling !== auto) row.insertBefore(el, auto);
				return;
			}
			if (el.parentNode !== row || row.lastElementChild !== el) row.appendChild(el);
		}

		/** 紧挨最后一个对话页签，不要 append 到整行末尾。 */
		function placeTabChip(row, el) {
			if (!row || !el) return;
			const tabs = row.querySelectorAll(":scope > [role='tab']");
			const last = tabs[tabs.length - 1];
			if (last) {
				if (el.previousElementSibling !== last) last.after(el);
				return;
			}
			if (el.parentNode !== row) row.appendChild(el);
		}

		function hasInlinePurgeEntry() {
			if (typeof document === "undefined") return false;
			const chipBtns = document.querySelectorAll(".dshp-hero-chip-btn, .dshp-tab-btn");
			for (let i = 0; i < chipBtns.length; i += 1) {
				const btn = chipBtns[i];
				if (!btn || (btn.closest && btn.closest(".dshp-dock, .dshp-launch"))) continue;
				if (btn.offsetParent || (btn.getClientRects && btn.getClientRects().length)) return true;
			}
			const nodes = document.querySelectorAll("button, [role='tab'], [role='button'], [class*='chip']");
			for (let i = 0; i < nodes.length; i += 1) {
				const el = nodes[i];
				if (!el || el.classList.contains("dshp-launch")) continue;
				if (el.closest && el.closest(".dshp-dock, .dshp-launch")) continue;
				if (/^(ys-pojia|ys-pojia)$/i.test(String(el.textContent || "").trim())) return true;
			}
			return false;
		}

		function PurgeLauncher() {
			const t = useT();
			const st = useDock();
			const [hide, setHide] = useState(hasInlinePurgeEntry);
			useEffect(() => {
				const sync = () => setHide(hasInlinePurgeEntry());
				sync();
				const obs = typeof MutationObserver !== "undefined"
					? new MutationObserver(sync)
					: null;
				if (obs && document.body) obs.observe(document.body, { childList: true, subtree: true });
				const iv = setInterval(sync, 800);
				return () => {
					if (obs) obs.disconnect();
					clearInterval(iv);
				};
			}, []);
			if (st.open || hide) return null;
			return h("button", {
				type: "button",
				className: "dshp-launch",
				"data-open": "0",
				"data-hide": "0",
				"data-testid": "ys-pojia-launch",
				title: t("dock.newSession"),
				onClick: () => toggleDock(),
			}, t("dock.newSession"));
		}

		/** 首页：模式旁挂「本插件」→ 打开插件。嘿客模式走模式下拉（registry 声明）。 */
		function HeroNewSessionMount() {
			const t = useT();
			const st = useDock();
			const [host, setHost] = useState(null);
			useEffect(() => {
				let dead = false;
				let warnedMiss = false;
				const ensure = () => {
					if (dead || typeof document === "undefined") return;
					/* 多路挂点兜底:语义化 data-* 优先,class 子串模糊匹配兜底(不绑定具体 CSS Module 哈希) */
					const row =
						document.querySelector('[data-dsh-hero-workspace-row]') ||
						document.querySelector('[data-conversation-hero]') ||
						document.querySelector('[class*="heroWorkspaceRow" i]') ||
						document.querySelector('[class*="hero" i][class*="workspace" i][class*="row" i]');
					if (!row) {
						if (!warnedMiss) {
							warnedMiss = true;
							try { console.warn("[ys-pojia] HeroNewSessionMount: anchor row missing (the host may have changed)"); } catch { /* ignore */ }
						}
						setHost((prev) => (prev ? null : prev));
						return;
					}
					warnedMiss = false;
					let el = row.querySelector(":scope > .dshp-hero-chip");
					if (!el) {
						el = document.createElement("div");
						el.className = "dshp-hero-chip";
						el.setAttribute("data-testid", "ys-pojia-hero-chip");
					}
					placeHeroChip(row, el);
					setHost((prev) => (prev === el ? prev : el));
				};
				ensure();
				const obs = typeof MutationObserver !== "undefined"
					? new MutationObserver(() => ensure())
					: null;
				if (obs) obs.observe(document.body, { childList: true, subtree: true });
				const iv = setInterval(ensure, 1000);
				return () => {
					dead = true;
					if (obs) obs.disconnect();
					clearInterval(iv);
				};
			}, []);
			if (!host) return null;
			const btn = h("button", {
				type: "button",
				className: "dshp-hero-chip-btn" + (st.open ? " on" : ""),
				title: t("dock.newSession"),
				onClick: () => toggleDock(),
			},
				st.open ? h("span", { className: "dshp-live-dot", "aria-hidden": "true" }) : null,
				t("dock.newSession"),
			);
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function") return rd.createPortal(btn, host);
			} catch { /* host 可能没暴露 react-dom */ }
			return null;
		}

		/** 挂在「对话 / 轨迹 / 上下文」这一排，紧挨上下文。 */
		function TabRowPurgeMount() {
			const t = useT();
			const st = useDock();
			const [host, setHost] = useState(null);
			useEffect(() => {
				let dead = false;
				let warnedMiss = false;
				const ensure = () => {
					if (dead || typeof document === "undefined") return;
					/* 多路挂点兜底:data-* 优先,ARIA / class 子串兜底 */
					/* The tab row may be labelled in the host locale; match either language. */
					const zhConversationTab = String.fromCharCode(0x5bf9, 0x8bdd);
					const row =
						document.querySelector("[data-conversation-tabs]") ||
						document.querySelector("[data-conversation-tabrow]") ||
						document.querySelector("[role='tablist'][aria-label*='" + zhConversationTab + "'], [role='tablist'][aria-label*='Conversation' i]") ||
						document.querySelector("[class*='conversation' i][class*='tab' i][class*='row' i]");
					if (!row) {
						if (!warnedMiss) {
							warnedMiss = true;
							try { console.warn("[ys-pojia] TabRowPurgeMount: tab row anchor missing"); } catch { /* ignore */ }
						}
						setHost((prev) => (prev ? null : prev));
						return;
					}
					warnedMiss = false;
					let el = row.querySelector(":scope > .dshp-tab-chip");
					if (!el) {
						el = document.createElement("div");
						el.className = "dshp-tab-chip";
						el.setAttribute("data-testid", "ys-pojia-tab-chip");
					}
					placeTabChip(row, el);
					setHost((prev) => (prev === el ? prev : el));
				};
				ensure();
				const obs = typeof MutationObserver !== "undefined"
					? new MutationObserver(() => ensure())
					: null;
				if (obs) obs.observe(document.body, { childList: true, subtree: true });
				const iv = setInterval(ensure, 1000);
				return () => {
					dead = true;
					if (obs) obs.disconnect();
					clearInterval(iv);
				};
			}, []);
			if (!host) return null;
			const btn = h("button", {
				type: "button",
				className: "dshp-tab-btn" + (st.open ? " on" : ""),
				title: st.open ? (t("dock.inSession") + " · On") : (t("dock.inSession") + " · Click to open"),
				onClick: () => toggleDock(),
			}, t("dock.inSession"));
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function") return rd.createPortal(btn, host);
			} catch { /* host 可能没暴露 react-dom */ }
			return null;
		}


		/* #208：undo 按钮不再注册进 conversation.input.right。
		   Android WebView 切后台返回时，宿主 composer 的 React 子树只要在提交阶段抛一次，
		   整块输入框就会被卸载；把按钮挪到 body 上的 fixed 宿主 + createPortal，
		   渲染树完全离开 composer，位置按 .standardControls 的矩形对齐。 */
		const REWIND_HOST_ATTR = "data-ys-pojia-rewind-host";
		const REWIND_RESERVE_PX = 64;

		function rewindControlsAnchor() {
			if (typeof document === "undefined") return null;
			// 取最靠下的那一组：输入框在页面底部；消息工具条里的同名控件更高，别抢。
			const list = document.querySelectorAll('[class*="standardControls"]');
			let best = null;
			let bestTop = -Infinity;
			for (let i = 0; i < list.length; i += 1) {
				const el = list[i];
				if (el.hidden) continue;
				const rect = el.getBoundingClientRect();
				if (!(rect.width > 0) || !(rect.height > 0)) continue;
				if (rect.top >= bestTop) { best = el; bestTop = rect.top; }
			}
			return best;
		}

		function placeRewindHost(host, anchor, reserve) {
			if (!host || !anchor) return;
			const rect = anchor.getBoundingClientRect();
			if (!(rect.width > 0) || anchor.hidden) {
				host.style.display = "none";
				return;
			}
			const width = host.offsetWidth || 60;
			const height = host.offsetHeight || 28;
			host.style.display = "block";
			host.style.left = Math.max(0, Math.round(rect.left + (reserve - width) / 2)) + "px";
			host.style.top = Math.round(rect.top + (rect.height - height) / 2) + "px";
		}

		function RewindDockMount() {
			const t = useT();
			const [host, setHost] = useState(null);
			const [, bump] = useState(0);
			const sessionId = currentSessionId(rewindSessions);
			// 没有会话时不留空位：按钮不显示，padding 也一起归还。
			const sessionRef = useRef(null);
			sessionRef.current = sessionId;
			const placeRef = useRef(null);

			useEffect(() => {
				if (typeof document === "undefined") return undefined;
				let el = document.querySelector("[" + REWIND_HOST_ATTR + "]");
				if (!el) {
					el = document.createElement("div");
					el.setAttribute(REWIND_HOST_ATTR, "");
					document.body.appendChild(el);
				}
				el.style.cssText = "position:fixed;z-index:2147482500;display:none;left:0;top:0;";
				setHost(el);
				let padded = null;
				let warned = false;
				let lastQuery = 0;
				const startedAt = Date.now();
				const place = (force) => {
					// 缓存锚点 + 1s 节流：只有锚点缺失/掉线时才全文档查一次，
					// 否则长会话里每帧扫 [class*=...] 会拖慢滚动。
					if (!padded || !padded.isConnected) {
						const now = Date.now();
						if (force || now - lastQuery > 1000) {
							lastQuery = now;
							const next = rewindControlsAnchor();
							if (padded && padded !== next) padded.style.paddingLeft = padded.dataset.dshpPad || "";
							if (next && next !== padded) next.dataset.dshpPad = next.style.paddingLeft || "";
							padded = next;
						}
					}
					const anchor = padded;
					if (!anchor) {
						el.style.display = "none";
						if (!warned && Date.now() - startedAt > 5000) {
							warned = true;
							try { console.warn("[ys-pojia] rewind: composer standardControls anchor missing"); } catch { /* ignore */ }
						}
						return;
					}
					// 按钮标签会随失败提示变长，预留宽度跟着实测宽度走，避免压到模型选择器。
					const reserve = Math.max(REWIND_RESERVE_PX, (el.offsetWidth || 60) + 12);
					const pad = sessionRef.current ? reserve + "px" : (anchor.dataset.dshpPad || "");
					if (anchor.style.paddingLeft !== pad) anchor.style.paddingLeft = pad;
					if (!sessionRef.current) {
						el.style.display = "none";
						return;
					}
					placeRewindHost(el, anchor, reserve);
				};
				place(true);
				placeRef.current = place;
				const onMove = () => place(false);
				const iv = setInterval(onMove, 500);
				window.addEventListener("resize", onMove);
				document.addEventListener("scroll", onMove, true);
				return () => {
					clearInterval(iv);
					placeRef.current = null;
					window.removeEventListener("resize", onMove);
					document.removeEventListener("scroll", onMove, true);
					if (padded) {
						padded.style.paddingLeft = padded.dataset.dshpPad || "";
						delete padded.dataset.dshpPad;
					}
					try { el.remove(); } catch { /* ignore */ }
				};
			}, []);

			// 会话切换/首次挂载时立刻对齐，不用等 500ms 定时器。
			useEffect(() => {
				if (placeRef.current) placeRef.current(true);
			}, [sessionId, host]);

			useEffect(() => {
				const offs = [];
				const watch = (store) => {
					try {
						if (store && typeof store.subscribe === "function") {
							offs.push(store.subscribe(() => bump((n) => (n + 1) % 1e9)));
						}
					} catch { /* ignore */ }
				};
				watch(rewindWorkspace && rewindWorkspace.selection);
				watch(rewindSessions && rewindSessions.list);
				const iv = setInterval(() => bump((n) => (n + 1) % 1e9), 2000);
				return () => {
					for (const off of offs) { try { off(); } catch { /* ignore */ } }
					clearInterval(iv);
				};
			}, []);

			if (!host || !sessionId) return null;
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function") {
					return rd.createPortal(h(RewindSafe, { sessionId, t }), host);
				}
			} catch { /* host 可能没暴露 react-dom */ }
			return null;
		}

		function installRewindUi(ctx) {
			rewindHost = ctx;
			rewindSessions = ctx.sessions;
			rewindWorkspace = ctx.uiWorkspace || null;
			rewindConversation = ctx.conversation || null;
			ctx.effect(() => installRewindWatch(ctx), "ys-pojia: rewind watch");
		}

		// 普通 command 结果不会激活宿主的空会话；补上输入节点，让结果卡片可见。
		/* 哪些命令名算「本插件的命令」。
		 *
		 * 主命令已从 `purge` 改成 `ysn`（`purge` 是通用词，会和别家插件撞名）。
		 * 这里同时列出子命令与别名：用户用 `/rules`、`/overclock` 这类独立命令时
		 * 也该回显输入节点，否则结果卡片会因为没有输入节点而不显示。
		 *
		 * 不含 `purge` —— 那个名字现在可能属于别家插件，回显成我们的样式会误导。 */
		const PURGE_COMMAND_NAMES = new Set([
			"ysn", "ys-pojia",
			"rules", "ysp-rules",
			"skills", "ysp-skills",
			"overclock", "ysp-overclock",
			"rewind", "ysp-rewind",
		]);
		const purgeCommandInputDefinition = {
			kind: "ys-pojia-command-input",
			target: "chat",
			match: (event) => event.type === "command/run" && PURGE_COMMAND_NAMES.has(String(event.data.name))
				? { id: String(event.data.commandId), role: "start" } : null,
			start: (_context, match) => ({
				commandId: match.event.data.commandId,
				seq: match.event.seq,
				time: match.event.time,
				text: `/${match.event.data.name}${(match.event.data.args ?? "").trimEnd()}`,
			}),
			update: (context) => context.state,
			buildViewNode: (context) => context.state === undefined ? null : ({
				key: context.key,
				id: context.id,
				kind: "ys-pojia-command-input",
				target: "chat",
				anchorSeq: context.state.seq - 0.1,
				location: context.start?.location ?? { kind: "unresolved" },
				visibility: "visible",
				data: {
					commandId: context.state.commandId,
					text: context.state.text,
					time: context.state.time,
				},
			}),
		};

		function PurgeCommandInputView({ node }) {
			return h("div", {
				role: "group", "aria-label": "ysn", "data-command-input": "",
				style: { display: "flex", justifyContent: "flex-end", padding: "8px 24px" },
			}, h("div", {
				style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: "100%",
					background: "var(--dsw-alias-bg-layer-2, #f3f4f6)", borderRadius: 12, padding: "10px 14px" },
			}, node.data.text));
		}

		function apply(ctx) {
			/* 命令回显节点：Android 上不注册。
			 *
			 * 这是上次手机适配失败的根因。DSH Go 的会话渲染器跟 Web 前端是两套
			 * 实现，它按自己的结构读 conversation.chat.node 的返回对象，字段对不上
			 * 就在「发消息」这一步抛 `Cannot read properties of undefined
			 * (reading 'length')` —— 消息根本没落盘，会话文件里只有一行 session 头。
			 *
			 * 代价评估：这个节点只负责把 /ysn 之类的调用在对话里画成一张输入
			 * 卡片，关掉不影响任何破甲能力（补丁、提示词注入、工具都在宿主进程里
			 * 跑，跟渲染器无关）。所以手机上直接跳过，换取「能正常发消息」。
			 *
			 * 为什么不在节点内部做兼容：Go 壳的渲染器读哪些字段、什么形状，我没有
			 * 它的源码可查，靠猜去补字段风险更高 —— 猜错还是崩，而且更难定位。 */
			const surface = clientGuessSurface();
			const isAndroid = surface === "android";
			if (!isAndroid && ctx.uiConversation && ctx.uiConversation.events && typeof ctx.uiConversation.events.register === "function") {
				ctx.uiConversation.events.register(purgeCommandInputDefinition);
				ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
					name: "conversation.chat.node", key: "ys-pojia-command-input",
				}, PurgeCommandInputView));
			}
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ys-pojia: dictionaries");
			/* 语言值可能来自 ctx.locale（string）或 current()（函数/对象），
			   取到就用，取不到保持 zh —— 界面文案有 zh 兜底，不会空白。 */
			try {
				const cur = typeof ctx.locale.current === "function" ? ctx.locale.current() : ctx.locale.current;
				const lang = typeof cur === "string" ? cur : (cur && (cur.lang || cur.locale || cur.id));
        /*
         * 语言优先级，从高到低：
         *   1. 用户在面板里手动选过的（localStorage）
         *   2. 系统语言（navigator.languages）—— 首次加载靠这个决定须知弹窗用哪种语言
         *   3. 宿主 locale —— 前两者都拿不到时才用
         *
         * 宿主 locale 排在系统语言后面是有意的：DSH 的 locale 默认跟随安装包，
         * 中文系统的用户装了英文包，宿主报 en 但用户想看中文。系统语言更准。
         */
        if (!readStoredLang() && typeof lang === "string" && lang) {
          // 只有系统语言探测也失败（返回默认 en 且没拿到任何 navigator 信息）时，
          // 才让宿主 locale 决定。detectSystemLang 内部已经做过三级回退，
          // 这里用它是否真的读到了 navigator 信息来判断。
          let sawNavigator = false;
          try {
            sawNavigator = Array.isArray(navigator.languages) && navigator.languages.length > 0
              || Boolean(navigator.language);
          } catch { /* navigator 不可用 */ }
          if (!sawNavigator) currentLang = /^zh/i.test(lang) ? "zh" : "en";
        }
			} catch { /* 保持默认 */ }
			/* shell.overlay 的挂载内容按面裁剪。
			 *
			 * Android（DSH Go）上只留两样：
			 *   - WelcomeNotice：首屏须知，纯 React 组件，不碰宿主 API
			 *   - PurgeDock：面板入口，用户要能打开插件面板
			 *
			 * 去掉三样：
			 *   - EnvAdaptSendGate：它挂住宿主 SessionInputShell.submit 做发送拦截。
			 *     Go 壳的 submit 签名与 Web 不同，wrapper 一旦返回错值，
			 *     「发消息」直接失败 —— 这正是上次崩溃所在的调用链。
			 *   - HeroNewSessionMount / TabRowPurgeMount / RewindDockMount：
			 *     都往宿主 UI 的特定位置挂组件，Go 壳没有那些位置。
			 *   - PurgeLauncher：浮动启动器，手机屏幕小、会盖住输入框。
			 *
			 * 破甲能力不受影响：补丁、提示词注入、工具全在宿主进程里跑。 */
			const overlayChildren = isAndroid
				? [h(WelcomeNotice), h(PurgeDock)]
				: [h(WelcomeNotice), h(PurgeLauncher), h(PurgeDock), h(HeroNewSessionMount), h(TabRowPurgeMount), h(EnvAdaptSendGate), h(RewindDockMount)];
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "ys-pojia-dock",
				order: 50,
			}, () => h(react.Fragment, null, ...overlayChildren)));
			try {
				if (typeof ctx.inject === "function") {
					ctx.inject(["sessions", "uiWorkspace", "workspaces", "conversation"], (host) => installRewindUi(host));
				} else if (ctx.sessions) {
					installRewindUi(ctx);
				}
			} catch (e) {
				try {
					if (typeof ctx.inject === "function") {
						ctx.inject(["sessions", "uiWorkspace", "conversation"], (host) => installRewindUi(host));
					}
				} catch (e2) {
					try { console.warn("[ys-pojia] rewind ui skipped:", e2 || e); } catch { /* ignore */ }
				}
			}
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
