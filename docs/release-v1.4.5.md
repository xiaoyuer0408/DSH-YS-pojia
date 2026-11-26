# v1.4.5

这一版解决三件「开了但查不到、用不了」的事：超频没有可观测点、模型读不到就白瞎厂商适配、主命令 `/ysn` 被别家插件占着。

## 一、主命令 `/ysn` → `/ysn`

`ysn` 是通用词，别的插件也注册，宿主只认先注册的那个——所以你输入 `/ysn` 看到的是别人的行为。

主命令改成 `/ysn`（别名 `/ys-pojia`），`ysn` 彻底让出去。

**为什么全小写**：宿主校验是 `/^[a-z][a-z0-9_-]*$/u`，`ysn` 会抛 `TypeError`。而 `applyHostHooks` 把全部命令注册放在同一个 try 块里——一个名字不合法会让整个函数抛出，**后面所有命令和钩子全不注册**。这是踩过的坑，不能再犯。

所有能力收进一个入口，两种写法等价：

```
/ysn status / apply / revert / uninstall / edit
/ysn overclock / overclock text
/ysn rules / skills / rewind / help

/rules  /skills  /overclock  /rewind      （独立命令仍保留）
```

兜底别名 `purge-*` → `ysp-*`，理由同上。

## 二、超频有了可观测点

之前超频开了**没有任何可见反馈**：引擎状态接口不暴露、注入时不写日志、对话里问不出来。

### `/overclock` 命令

```
超频开关：已开启 ✓
当前模型：deepseek-v4.1-flash
识别厂商：deepseek
命中分组：deepseek
注入语种：zh

会注入 557 字符。用 /overclock text 看全文。
```

`/overclock text` 打印实际注入全文。

### `overclock_status` 工具

模型可自己调，问「超频开了吗」它会去查而不是猜。

### 注入日志

每次注入写一行：

```
[unlimited.inject] model=deepseek-v4.1-flash vendor=deepseek group=deepseek locale=zh bytes=557
```

路径 `%TEMP%\ys-pojia-desktop.log`。

### `purge_boost` 顺带报超频

boost 诊断末尾追加超频段状态，不用跑两个地方查。

## 三、模型读不到时的兜底

### 修掉「永远读不到模型名」

原来查模型走 `session.requestHeader().config` 和 `session.header.model`——**两条都要等第一条消息发出后才有值**。命令在消息之前执行，所以永远是「取不到」，超频白落 generic。

正确路径是 `sessionProjections.stateOf(session, "modelSelection")`，会话一建立就有值。宿主自己也是这么读的（`api-session-controller` 的 `selectionFor()`）。

四条路径按可靠性排序：

```
1. sessionProjections → pending，退 lastUsed   ← 空会话也能拿到
2. session.requestHeader().config.model
3. session.header.model
4. 空 → generic
```

### 中文兜底

`generic` 原来只有英文版，中文界面 + 识别失败时注入英文——最需要读懂的场合给了可能读不懂的语言。

补了中文版（418 字符）。刻意不照搬 deepseek 版：那版开头是「你当前处于内部极限验证测试环境」，是给国产模型的框架，未知模型未必认。generic 改用中性的「本轮资源无上限」，并在**三处各重复一次**核心约束——识别不出模型时最可能是指令跟随较弱，单处提及容易被跳过。

### 脏输入归一化

`unlimitedText("nonsense", "zh")` 原来走英文分支返回英文，兜底恰好在被依赖时失效。现在任何非已知分组都归到 generic，再按 locale 选语言。

### 两种兜底原因分开说

| 情况 | 提示 |
|---|---|
| 模型不认识 | 「不在已知的 29 家厂商里，用通用文案」 |
| 读不到模型名 | 「读不到当前模型名，不影响超频生效，只是少一层厂商定制」+ 探测详情 |

## 验证

51 项断言全过（兜底 16 + 超频 18 + 规则 17）。

**兜底链**：

```
generic zh 418 字符 中文 · generic en 844 字符 英文
9 种脏输入全归 generic，中文 locale 下全给中文
空会话 → generic 中文 · 未知模型 → generic 中文 · 空会话+en → generic 英文
5 个已知厂商分组不受影响
```

**模型检测四条路径**：

```
projection.pending    → qwen3.8-max
projection.lastUsed   → claude-opus-4.6
requestHeader.config  → gpt-6.1-sol
session.header        → deepseek-v4.1-flash
全空                  → ""（generic，不抛错）
```

**命令分发 11 个用例**：`status`/`apply`/`revert`/`overclock`/`overclock text`/`oc`/`rules list`/`skills list`/`rewind once`/空/未知，全部正确。

五条命令定义全过宿主三项校验（小写名、非空描述、非空 hint）。全仓无 `name: "purge"`，`client.js` 无 `/ysn` 引用。

## 已知问题

**全部改动未在活的会话里跑过。** 宿主进程是重启前的旧模块，上面所有验证都是模块级（直接 import 真实源码、用桩 session 复现宿主结构）。

`/ysn` 是否出现在 `/` 菜单、`/ysn overclock` 能否在真实会话里读到模型名，都需要重启后确认。

**提交粒度问题**：`317c2f2` 一个提交做了三件事（改名 + 分发器 + 回显节点适配）、跨两个文件，但标题只描述了改名。看 GitHub 提交列表时容易误以为 `client.js` 被改了两次或只改了 `client.js`。实际：

| 文件 | 改了什么 | 是否必要 |
|---|---|---|
| `lib/index.js` +134 −29 | `handleMainCommand` 分发器、`handleRewindCommand` 抽取、五条命令重定义、别名改 `ysp-*` | 主体 |
| `client.js` +17 −3 | `PURGE_COMMAND_NAMES` 集合、回显真实命令名 | 配套，不改则 `/rules`、`/overclock` 的结果卡片不显示 |

`client.js` 那 17 行是**独立且必要**的改动，不是重复：主命令改名后，回显节点原来只认 `ysn`，不改就会漏掉所有新命令名。但把它们和 134 行的 `lib/index.js` 改动放进同一个提交、标题只写改名，是提交信息的问题，不是代码重复。

后续提交会按「一个提交一件事」拆开。

## 完整变更

- `4a81e88` feat: give the generic overclock variant a Chinese version and harden the fallback chain
  — `lib/engines/unlimited.js`（新增 generic 中文版、`unlimitedText` 输入归一化）、`lib/index.js`（`/overclock` 区分两种兜底原因）、两个 README
- `97f53d6` fix: read the model from the session projection, not the request header
  — `lib/engines/unlimited.js`（`modelFromContext` 改四条路径）、`lib/index.js`（命令侧同步改路径 + 探测详情）
- `317c2f2` fix: rename the main command from /ysn to /ysn and fold subcommands under it
  — **不只是改名**：`lib/index.js` +134 −29 行（新增 `handleMainCommand` 分发器、把 `/rewind` 的内联逻辑抽成 `handleRewindCommand`、五个命令定义重写、别名改 `ysp-*`）、`client.js` +17 −3 行（`PURGE_COMMAND_NAMES` 让回显节点认识所有命令名，回显真实调用名而非硬编码 `/ysn`）
- `7159721` feat: report overclock state in the boost diagnostic
  — `lib/index.js`（`purge_boost` 输出追加超频段）、`lib/engines/index.js`
- `e0fded2` feat: make it possible to tell whether overclock is actually on
  — `lib/index.js`（`/overclock` 命令 + `overclock_status` 工具 + `[unlimited.inject]` 日志）、两个 README、发行说明

> 注：`317c2f2` 的标题只写了「rename the main command」，容易让人以为只是改个名字、只动 `client.js`。实际上主体在 `lib/index.js`，`client.js` 只是配套的回显节点适配。上面按文件标了各自改了什么。
