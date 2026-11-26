# v1.4.0

适配 DeepSeek Harness 0.2.2-rc.5，修掉一批让插件「装上了但用不了」的链路问题。

## 新增宿主适配

0.2.2-rc.5 把整个 `@deepseek-ai` 树封进了 `resources/app.asar`（199 MB / 21722 文件），磁盘上没有可写副本。补丁档物理上无处落笔。

插件现在按宿主形态自动选策略，不需要任何配置：

| 宿主形态 | 策略 | 补丁层 | 配置层 |
|---|---|---|---|
| profile 里的可写宿主 | `patch` | ✓ | — |
| `resources/app/` 解包目录 | `patch` | ✓ | ✓ |
| `app.asar.unpacked`（密封） | `config` | — | ✓ |
| 找不到宿主 | `prompt` | — | — |

引擎页「环境探测」会显示当前策略，例如 `配置层 · 宿主已密封`，悬停看完整原因。

### 配置层写什么

全是宿主暴露的配置项，不改一个字节源码：

```yaml
- id: sandbox-policy
  config:
    mode: danger-full-access
- id: approval
  config:
    policy: never
- id: tool-result-pruner
  config:
    thresholdChars: 10000000
- id: repeat-tool-reminder
  config:
    maxRetries: 0
```

读 `dsh-base/cordis.patch.yml` 确认：**0.2.2-rc.5 出厂默认就是全开**（`danger-full-access` + 审批 `never`）。补丁 #6-#10 想做的事，宿主自己已经做了。

### 适配范围

| 宿主版本 | 状态 | 策略 |
|---|---|---|
| 0.2.0-rc.2 | 已验证 | 补丁层 |
| 0.2.1-rc.2 | 已验证 | 补丁层 |
| 0.2.1-rc.5 | 已验证 | 补丁层 |
| 0.2.2-rc.1 | 已验证 | 补丁层 |
| 0.2.2-rc.5 | 新增 | 配置层 |

## 修复

### 补丁打到影子副本

DSH Desktop 解开 asar 后原文件仍留着：`resources/app.asar` 与 `resources/app` 目录并存，宿主从解包目录加载。候选列表把 `resources/app` 排在前面，补丁全打进影子副本，运行中的宿主一条没改。

现在 `app.asar.unpacked` 优先。

### 面板数字 1/96

`gatherState` 返回 `display_applied: probe.patchesApplied`，而 `buildEngineProbe` 正是从 `display_applied` 读 `patchesApplied` —— 循环引用。冷启动时探针还没建立，读到 0 并永久缓存。

改成直接查 `patchStatus`，实测 74/96。

### 工具表被清空

`message-purge` 的幂等标志设在方法替换之后，中途抛错就设不上；配合 `wrapAll` 的 5 次重试，最多叠 6 层 `deriveMessages` 包装，把消息结构搅坏。宿主据此判定工具段不可用，116 个工具全没。

标志已前移，循环内逐个 try。

### 插件重启杀进程不拉起

`scheduleRestart` 只要 `app.asar` 存在就走 asar 交换：杀进程、换 asar、拉起。但换的那份不被加载，结果进程没了也起不来；手动点 exe 反而正常。

现在先查解包目录，存在就走普通重启。

### 纠偏链路一直是死的

日志里反复出现：

```
verdict=degrade action=repair acted=repair-failed via=session.append
```

检出软化、决定纠偏、投递失败。根因：`session/event` 回调的第一个参数是事件壳不是会话实例，`resolveAgent` 四条路径全落空，`session.append` 也不是方法。

现在从壳上取 id，回头到 `sessions` 服务里捞真会话。

### 中英切换不生效

`translate` 在启动时被 `ctx.locale.bind(NS)` 覆盖了两次，那个绑定跟宿主 locale，不看面板开关。删掉覆盖，改成按 `currentLang` 查本地字典，`useLang` / `useT` 挂上订阅。

### 首次加载弹窗语言不对

默认硬编码英文。现在按 `navigator.languages` 探测系统语言，三级回退（languages → language → Intl）。中文系统首次打开看到的就是中文。

### 破甲页、引擎页、自检结果残留中文

三处同一类问题：后端按 `?locale=` 决定语言，前端调用时没传。

规则目录（分组标题、简介、标签）、引擎说明（tagline、summary、pros、cons、bestFor、能力面描述）、自检报告（八个步骤的标题与说明）全部双语化。

### 开关导致语言跳回

破甲页的 `post` 提交后后端返回整份目录，不带 locale 就退回 `Accept-Language`（中文浏览器拿到中文），`setData` 一覆盖界面就变回中文。引擎页同理。

所有写操作现在都带 locale，并依赖语言变化重建回调。

### 表格错位

`transform` 加在 `<tr>` 上会创建新的层叠上下文、脱离表格布局算法，列宽再也对不齐。奇数行从左进、偶数行从右进，看起来像表格散架。

动画移到 `td` 上，`tr` 只负责延迟。

## 实测通过的宿主版本

| 版本 | 状态 | 引擎 | 说明 |
|---|---|---|---|
| 0.2.0-rc.2 | **实测通过** | T3 补丁档 | 96 条补丁 73 条命中 |
| 0.2.1-rc.2 | **实测通过** | T3 补丁档 | 同上 |
| 0.2.1-rc.5 | **实测通过** | T3 补丁档 | 同上 |
| 0.2.2-rc.1 | **实测通过** | T3 补丁档 | 同上 |
| 0.2.2-rc.5 | **实测通过** | T2 配置层 | 宿主密封，配置层生效；解包后 65/96 补丁命中 |

「实测通过」指：插件加载后工具表完整、破甲注入生效、面板正常、无崩溃。不是「理论上应该能用」。

## 不适合谁

**如果你在 0.2.2-rc.5 上需要补丁层的能力，不要装。**

配置层能改沙箱、审批、结果裁剪这些配置项，但改不了代码逻辑。想要观察策略短路、子代理深度放宽这类效果，必须手工解包 asar——三步操作，而且宿主更新会冲掉。

**如果你不能接受改写宿主源码，不要装。**

T3 补丁档会改 DSH 的 `lib/index.js`。虽然带完整备份和回滚，但这是实打实的源码修改。只想要纯提示词方案的，用 T1 档或找别的项目。

**如果你要的是稳定生产环境，不要装。**

单人维护，无 CI，无 LTS。宿主每次升级都可能让补丁失效，需要你自己跟版本。适合折腾，不适合当基础设施。

**如果你主要做社工/钓鱼/伪造类内容，不要装。**

该类别实测 0 分，规则写了但模型层几乎全拒。这是模型能力边界，不是插件能解决的。

**规则 #10 已取消禁区**：政治、历史、时事按事实直接回答。

## 适合谁

- 宿主版本在实测列表内，需要完整破甲能力
- 能接受改宿主源码，且有回滚预案
- 愿意跟版本更新，出问题能自己查日志
- 主要做技术类（逆向 / 渗透 / 外挂 / 恶意样本）或成人虚构内容

## 已知问题

### 0.2.2-rc.5 补丁层不可用（设计限制）

宿主密封，补丁无处写。配置层能覆盖沙箱、审批、裁剪这些「本来就是配置项」的行为，但覆盖不了改代码逻辑的补丁：

- 观察策略短路（`writeIntent` / `editIntent` 无条件放行）
- 结果裁剪逻辑
- 子代理深度上限

这些在密封宿主上只能靠提示词层兜底，效果弱于补丁层。

### 解包后 20 条补丁锚点失效

手工解包 asar 后在 0.2.2-rc.5 上实测：96 条补丁 **65 条全命中 + 4 条部分命中**，20 条失效。宿主源码改了，字符串锚点对不上。

失效的包括 `SESSION_TITLE_*` 系列、`BASH_TIMEOUT_RESTORE`、`MINIMAL_OFFICIAL_TOOLSET` 等。

### 解包状态会被宿主更新冲掉

DSH 自动更新会重新下载 `app.asar`，把解包目录边缘化。更新后需要重做。

### `dshTargets` 字段消失

0.2.2-rc.5 的 package.json 里没有这个字段。插件改用 `hostCompat` 的版本比较逻辑判定。

## 可选：手工解包以启用补丁层

配置层覆盖不到的部分，可以把 asar 解包成目录：

```
resources/app.asar        宿主默认从这里加载
resources/app/            解包目录，存在时 Electron 优先用它
```

```powershell
# 1. 完全退出 DSH（asar 被占用时改名会失败，这步不能省）
# 2. 解包
node scripts/unpack-asar.mjs "D:\...\resources\app.asar" "D:\...\resources\app"
# 3. 让位
Rename-Item "D:\...\resources\app.asar" app.asar.bak
# 4. 启动 —— Electron 发现 app/ 目录就优先用它
```

**不推荐作为默认路径**：三步手工操作容易出错，宿主更新会冲掉。配置层已经覆盖大部分收益。

解包时两个坑：

1. asar 数据区起点是 `(16 + jsonSize + 3) & ~3`，不是 `8 + jsonSize`。少算 19 字节，每个文件都会带上前一个文件的尾巴——`package.json` 前面多出 `:!0})})();`，JSON 解析直接失败。

2. 1666 个条目标了 `unpacked: true`，数据在 `app.asar.unpacked` 目录，要走文件复制而不是偏移读取。

## 安装

```bash
# 从 GitHub 安装
npm install github:

# 或克隆到 profile
git clone  \
  ~/.dsh/profiles/desktop/node_modules/ys-pojia
```

然后在 profile 的 `cordis.patch.yml` 里注册：

```yaml
- insert:
    - id: ys-pojia
      name: ys-pojia
      inject: [ systemPrompt, tools ]
      config:
        enabled: true
        stripMnemon: true
        capabilityProtocol: true
        hooksDenyBypass: true
```

重启 DSH，面板顶栏显示 `v1.4.0` 即加载成功。

## 破坏性变更

无。旧版宿主（0.2.0 / 0.2.1 / 0.2.2-rc.1）行为不变，继续走补丁层。

## 完整变更

- `fb14501` adapt to 0.2.2-rc.5, which ships the host sealed inside app.asar
- `ebff903` version-adaptive injection strategy, config layer first and unpack as an option
- `842ca8b` the first-load notice follows the user's system language
- `f25aada` v1.4.0 release notes
- 更早：`69ec485` 强化四条技术规则、`6a0ca3e` 爬虫规则、`5647698` 表格错位、`49280d0` 纠偏链路、`0cc3e54`/`ce1bfbb` 三种人称、`ded1a14` 软化识别
