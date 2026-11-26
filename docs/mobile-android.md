# 手机端（DSH Go / Android）适配说明

这份文档记录 Android 端适配的做法、为什么这么做、以及没验证的部分。

---

## 上次失败的原因

2026-11 尝试过一轮手机适配（4 个提交，分支 `mobile-backup-2edfc4e`），最终回退。

**症状**：手机上发消息报 `UNKNOWN Cannot read properties of undefined (reading 'length')`。

**关键证据**：解压崩溃那条会话文件，只有一行：

```json
{"type":"session","version":4,"id":"session-8e7ed8ef-...","agentPreset":"standard"}
```

没有用户消息，没有回复。崩在「发消息」这一步，消息根本没落盘。

**根因**：插件往 `conversation.chat.node` 注册了自定义节点（把 `/ysn` 调用渲染成输入卡片）。DSH Go 的会话渲染器是 Flutter 壳 + 预构建 vite dist，**跟 Web 前端不是同一套实现**。它按自己的结构读节点返回对象的字段，字段对不上就在构建消息列表时抛错。

---

## 这一版的做法

三个改动，都在副本 `D:\Users\Downloads\YS-破甲` 上做。

### ① `lib/surface.js` 加 android 面

`SURFACES` 从 `["web", "desktop", "gui", "tui"]` 扩到包含 `"android"`。

新增 `isAndroidSurface()`，五条判据任一命中即算：

| 判据 | 说明 |
|---|---|
| `DSH_SURFACE=android` | 显式指定，最高优先 |
| `DSH_GO_RUNTIME_ROOT` 存在 | Go 壳会设这个环境变量 |
| `DSH_GO=1` | 同上 |
| `process.platform === "android"` | 少见但存在 |
| 路径含 `/data/data/`、`/data/user/`、`/com.termux/` | 安卓应用目录特征 |
| `os.release()` 含 android | 兜底 |

**为什么全部失败时返回 false**：宁可判成 web 也不要误判成 android。误判会让桌面用户丢面板。

**为什么 android 排在 desktop 判定之前**：Go 壳的运行时目录形如 `/data/data/io.github.ccch1mneyyy.dsh_app/files/...`，里面有 `resources/` 之类子目录，可能被桌面树正则误命中。反过来安卓上 `execPath` 可能是 termux 的 node，名字不匹配任何桌面 exe，但路径带 `/com.termux/`。两种误判方向都要靠这个顺序挡住。

`adapterFor("android")` 返回 `"web"` —— 安卓上没有「重启 exe」「asar 交换」这些操作，web adapter 的重启语义（让用户手动重开）是唯一有意义的行为。面本身仍返回 `"android"`，前端据此裁剪。

### ② `client.js` Android 上跳过 `conversation.chat.node`

```js
const surface = clientGuessSurface();
const isAndroid = surface === "android";
if (!isAndroid && ctx.uiConversation && ...) {
  ctx.uiConversation.events.register(purgeCommandInputDefinition);
  ctx.slots.inject("conversation.chat.node", () => ...);
}
```

**代价评估**：这个节点只负责把 `/ysn` 调用画成一张输入卡片。关掉不影响任何破甲能力 —— 补丁、提示词注入、工具都在宿主进程里跑，跟渲染器无关。用「能正常发消息」换「少一张卡片」是划算的。

**为什么不在节点内部做兼容**：Go 壳的渲染器读哪些字段、什么形状，我没有它的源码可查。靠猜去补字段风险更高 —— 猜错还是崩，而且更难定位。

`clientGuessSurface()` 也加了 android 判断，三条判据：

1. UA 含 Android **且不含** Electron（Electron + Android 字样仍判 desktop）
2. `window.__DSH_GO__` 存在
3. 协议是 `capacitor:` 或 `ionic:`

### ③ `shell.overlay` 在 Android 上只留两个组件

原来挂七个，Android 上砍到两个：

| 组件 | Android | 原因 |
|---|---|---|
| `WelcomeNotice` | ✅ 保留 | 首屏须知，纯 React 组件，不碰宿主 API |
| `PurgeDock` | ✅ 保留 | 面板入口，用户要能打开插件面板 |
| `EnvAdaptSendGate` | ❌ 去掉 | 挂住宿主 `SessionInputShell.submit` 做发送拦截。Go 壳的 submit 签名与 Web 不同，wrapper 返回错值会让发消息直接失败 —— 这正是上次崩溃所在的调用链 |
| `HeroNewSessionMount` | ❌ 去掉 | 往宿主 UI 特定位置挂组件，Go 壳没那个位置 |
| `TabRowPurgeMount` | ❌ 去掉 | 同上 |
| `RewindDockMount` | ❌ 去掉 | 同上 |
| `PurgeLauncher` | ❌ 去掉 | 浮动启动器，手机屏幕小、会盖住输入框 |

---

## 验证

### 服务端 surface 探测 16 项

```
Android 探测 8 项：DSH_SURFACE / DSH_GO_RUNTIME_ROOT / DSH_GO / platform /
                  app 目录 / termux → true；普通 Linux / Windows → false
detectSurface 3 项：android 优先于 desktop / 显式 web 不被误判 / 桌面仍判 desktop
hostSurface 3 项：android 树不被当桌面 / 桌面树仍判 desktop / 普通路径回退 web
adapterFor 2 项：android → web / desktop → desktop
```

### 客户端判断 7 项

```
Android UA → android
Electron UA → desktop
Electron + Android 字样 → desktop（不误判）
window.__DSH_GO__ → android
capacitor 协议 → android
普通浏览器 → 空
navigator 缺失不抛错
```

### 回归

原有用例全过：超频 18 项、规则 17 项、兜底 16 项。7 个核心 JS 文件 `node --check` 全过。

---

## 没验证的部分

**没有在真机上跑过。** 全部是模块级测试（注入环境变量与桩对象调函数）。以下需要真机确认：

1. DSH Go 是否真的设置了 `DSH_GO_RUNTIME_ROOT` 或 `DSH_GO` —— 如果都没有，只能靠路径判断，而路径可能被 Flutter 沙箱挡住
2. `conversation.chat.node` 不注册后，发消息是否真的不崩
3. `EnvAdaptSendGate` 去掉后，`shell.overlay` 里剩下两个组件是否正常工作
4. `PurgeDock` 在手机窄屏上的布局

**如果真机上还崩**，下一步排查方向：

- 用 `adb logcat` 抓 Flutter 侧的异常栈，看抛在哪个组件
- 逐个减组件：先把 `PurgeDock` 也去掉，只留 `WelcomeNotice`，确认是否还崩
- 如果只剩 `WelcomeNotice` 还崩，说明问题不在 `shell.overlay`，要看 `installRewindUi` 那条 `ctx.inject` 路径

---

## 与主仓库的关系

这是**副本**，改动没有推回 `C:\Users\Administrator\.dsh-community\plugins\ys-pojia`。

推回前要确认的事：

1. 桌面端行为完全不变（Android 判断全部 false 时走原路径）
2. `SURFACES` 增加 `"android"` 是否影响宿主对 surface 的校验 —— 宿主自己的 surface 枚举里可能没有 android，插件多报一个值可能被拒
3. 主仓库发版流程要不要带上这份改动

建议：先在副本上真机验证通过，再把三处改动 cherry-pick 回主仓库。
