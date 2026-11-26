# v1.5.0

适配手机端（DSH Go / Android）。这一版解决的是「插件装上去就发不出消息」的问题。

## 上次为什么失败

2026-11 试过一轮手机适配（4 个提交，分支 `mobile-backup-2edfc4e`），最终回退。

**症状**：手机上发消息报 `UNKNOWN Cannot read properties of undefined (reading 'length')`。

**关键证据**：解压崩溃那条会话文件，只有一行：

```json
{"type":"session","version":4,"id":"session-8e7ed8ef-...","agentPreset":"standard"}
```

没有用户消息，没有回复。崩在「发消息」这一步，消息根本没落盘。

**根因**：DSH Go 是 Flutter 壳 + 预构建 vite dist，**跟 Web 前端不是同一套渲染器**。插件往 `conversation.chat.node` 注册的自定义节点，Go 壳按自己的结构读字段，对不上就抛错。

## 这一版改了什么

三处改动，全部有守卫，桌面端行为不变。

### ① `lib/surface.js` 加 android 面

`SURFACES` 从 `["web", "desktop", "gui", "tui"]` 扩到包含 `"android"`。

新增 `isAndroidSurface()`，六条判据任一命中即算：

| 判据 | 说明 |
|---|---|
| `DSH_SURFACE=android` | 显式指定，最高优先 |
| `DSH_GO_RUNTIME_ROOT` 存在 | Go 壳会设 |
| `DSH_GO=1` | 同上 |
| `process.platform === "android"` | 少见但存在 |
| 路径含 `/data/data/`、`/data/user/`、`/com.termux/` | 安卓应用目录特征 |
| `os.release()` 含 android | 兜底 |

**为什么全失败返回 false**：宁可漏判成 web，也不误判成 android——误判会让桌面用户丢面板。

**为什么 android 排在 desktop 之前**：Go 壳的运行时目录形如 `/data/data/io.github.ccch1mneyyy.dsh_app/files/runtime/rootfs/...`，里面有 `resources/` 之类子目录，会被桌面树正则误命中；反过来安卓上 `execPath` 可能是 termux 的 node，名字不匹配任何桌面 exe，但路径带 `/com.termux/`。两个误判方向都要靠这个顺序挡住。

`adapterFor("android")` 返回 `"web"`——安卓上没有「重启 exe」「asar 交换」，web adapter 的重启语义（让用户手动重开）是唯一有意义的行为。面本身仍返回 `"android"`，前端据此裁剪。

### ② `client.js` Android 上跳过 `conversation.chat.node`

```js
const surface = clientGuessSurface();
const isAndroid = surface === "android";
if (!isAndroid && ctx.uiConversation && ...) {
  ctx.uiConversation.events.register(purgeCommandInputDefinition);
  ctx.slots.inject("conversation.chat.node", () => ...);
}
```

**代价**：这个节点只负责把 `/ysn` 调用画成一张输入卡片。关掉不影响任何破甲能力——补丁、提示词注入、工具都在宿主进程里跑，跟渲染器无关。用「一张卡片」换「能正常发消息」。

**为什么不在节点内部做兼容**：Go 壳的渲染器读哪些字段、什么形状，没有源码可查。靠猜去补字段风险更高——猜错还是崩，而且更难定位。

`clientGuessSurface()` 也加了 android 判断，三条判据：UA 含 Android **且不含** Electron、`window.__DSH_GO__` 存在、协议是 `capacitor:` 或 `ionic:`。

### ③ `shell.overlay` 在 Android 上只留两个组件

原来挂七个，Android 上砍到两个：

| 组件 | Android | 原因 |
|---|---|---|
| `WelcomeNotice` | 保留 | 首屏须知，纯 React，不碰宿主 API |
| `PurgeDock` | 保留 | 面板入口 |
| `EnvAdaptSendGate` | 去掉 | 挂住宿主 `SessionInputShell.submit` 做发送拦截。Go 壳的 submit 签名与 Web 不同，wrapper 返回错值会让发消息直接失败——**正是上次崩溃所在的调用链** |
| `HeroNewSessionMount` | 去掉 | 往宿主 UI 特定位置挂组件，Go 壳没有 |
| `TabRowPurgeMount` | 去掉 | 同上 |
| `RewindDockMount` | 去掉 | 同上 |
| `PurgeLauncher` | 去掉 | 浮动启动器，手机小屏会盖住输入框 |

## 真机验证

在 OPPO PLQ110（Android，KernelSU root）上实测。

**安装位置**：DSH Go v1.3.0 把 DSH 运行时放在 Linux 容器根里

```
/data/data/io.github.ccch1mneyyy.dsh_app/files/runtime/rootfs/
├── opt/dsh/node_modules/          ← 宿主包
└── root/.dsh/                     ← DSH home
    ├── profiles/web/node_modules/ys-pojia/   ← 插件装这里
    ├── prompt-inject.md
    └── ys-pojia/
```

**部署步骤**：

```bash
# 推送（排除 .git / ai_workspace / node_modules）
adb push <staged> /data/local/tmp/ys-pojia-new

# 备份现有版本
adb shell su -c "cp -a <nm>/ys-pojia <nm>/ys-pojia.bak-1.4.0-<ts>"

# 替换并修正属主（root 复制会变 root，必须改回 u0_a421）
adb shell su -c "rm -rf <nm>/ys-pojia"
adb shell su -c "cp -a /data/local/tmp/ys-pojia-new <nm>/ys-pojia"
adb shell su -c "chown -R 10421:10421 <nm>/ys-pojia"

# 重启
adb shell am force-stop io.github.ccch1mneyyy.dsh_app
adb shell am start -n io.github.ccch1mneyyy.dsh_app/.LauncherMist
```

**加载确认**（关键证据）：

| 检查项 | 结果 |
|---|---|
| `ys-pojia/installed-rev` | `apply:1.5.0` |
| `prompt-inject.md` | 90742 → 166509 字节，02:48 更新 |
| `override-state.json` | `customized: false`，用内置默认 |
| 文件数 | 147 |
| `lib/surface.js` 里 `isAndroidSurface` | 3 处 |
| `client.js` 里 `isAndroid` | 3 处 |
| `lib/index.js` 里 `ysn` | 16 处 |

**测试结果**：手机端发消息正常，插件功能可用。

## 模块级验证

23 项断言：

```
服务端 surface 16 项：六条 Android 判据全 true / 普通 Linux 与 Windows 全 false /
  android 在 detectSurface 与 hostSurface 都优先于 desktop / 桌面树仍判 desktop /
  普通路径回退 web / adapter 映射
客户端 7 项：Android UA / Electron UA / Electron + Android 字样仍判 desktop /
  __DSH_GO__ / capacitor 协议 / 普通浏览器 / navigator 缺失不抛错
```

原有用例全过：超频 18 项、规则 17 项、兜底 16 项。核心 JS 文件 `node --check` 全过。

## 已知问题

**`PurgeDock` 在手机窄屏的布局没有专门优化。** 面板能打开、能用，但没按手机尺寸重排。

**Android 上命令回显卡片没了。** 这是有意的取舍，见上文 ②。

**`SURFACES` 多了 `android` 值。** 宿主自己的 surface 枚举里可能没有这个值，如果某处严格校验可能会拒。目前没观察到问题。

## 完整变更

- 三处 Android 适配：`lib/surface.js`（+88 行）、`client.js`（+54 行）、`docs/mobile-android.md`（新增）
- 详细技术说明见 `docs/mobile-android.md`
