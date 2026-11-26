# v1.5.1

常规维护版本。

---

## 说明

本次更新为内部维护，不涉及功能变更说明。

建议更新到最新版以获得最佳体验。若你在使用中遇到问题，欢迎通过
[Issues](/issues) 反馈。

## 升级方式

本插件没有服务器，不会自动检查更新。要看有没有新版本，去仓库的 Releases 页：

**[github.com//releases](/releases)**

确认有新版本后，在插件目录执行：

```bash
git pull
npm run deploy
```

`npm run deploy` 会把插件同步到当前 profile 的 `node_modules`，重启 DSH 后生效。

## 兼容性

| 项 | 状态 |
|---|---|
| DSH 版本 | 与 v1.5.0 相同，覆盖 0.2.0-rc.2 ~ 0.2.2-rc.5 |
| 三档引擎 | T3 / T2 / T1 全部保留 |
| 40 条规则 | 无变化 |
| 手机端（DSH Go） | 支持 |
| 配置与授权 | 无需重新配置 |

## 回滚

```bash
git checkout v1.5.0
npm run deploy
```
