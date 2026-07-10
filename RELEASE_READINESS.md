# 星仓印记发布复盘

更新日期：2026-07-10

本文记录本轮 P0/P1 整改的证据、仍然存在的边界，以及“可以上传源码”和“可以直接公开部署”之间的区别。

## 结论

- 源码治理：具备 Git 基线、自动化测试、视觉回归、敏感文件忽略和可审查 diff，可以进入公开仓库前的最终密钥检查。
- 本地产品：SQLite、IndexedDB、方案隔离、学习驱动发现和持久化任务已经达到个人本地使用基线。
- Web 静态模式：适合无账号、本地数据留在浏览器的部署方式。
- Node 公网服务：不能裸端口上线。只有置于 TLS、认证网关、CDN/WAF、审计和 Secret Manager 后才进入可评估范围。
- 任意领域：当前建立了通用生成契约和多领域证据，不能宣称对所有可能输入都已证明正确。

## 本轮整改证据

| 事项 | 实现 | 自动化证据 |
|---|---|---|
| 默认方案污染 | 项目保存方案归属；默认池排除 custom-only；切换扫描只替换目标方案；删除方案清理孤立项目 | `tests/observation-plan-query-limit.test.js` |
| Git 基线 | 初始提交 `bedb953`，后续升级保持在可审查工作树 | `git log`、`git status` |
| Node 存储 | SQLite WAL；项目、方案、扫描、方案关系按表写入；旧 JSON 不再被运行时修改 | `tests/sqlite-storage.test.js` |
| Web 存储 | IndexedDB v4；projects/plans/scans/leaderboards 分对象仓库；核心、项目、榜单分页同步 | `tests/indexeddb-storage.test.js`、`tests/http-integration.test.js` |
| 泛化质量门 | 删除历史领域词包；统一元认知提示词；锚点、数量、语法、噪声和可执行一致性检查 | 10 类陌生领域矩阵、`scripts/observation-plan-quality-audit.js` |
| 学习驱动发现 | 明确行为权重；默认方案可生成学习查询；自定义方案在域内调整 profile 顺序与候选预算；负向信号保留探索底线 | `tests/learning-driven-discovery.test.js`、`tests/local-api.test.js` |
| 长任务恢复 | scan/analysis/plan-generation 持久化；刷新继续轮询；重启重新排队；最多重试 3 次；结果绑定创建时方案 | `tests/durable-tasks.test.js`、`tests/local-api.test.js` |
| 公网应用边界 | 非 loopback 强制 AUTH_TOKEN；Origin、可信代理、SSRF、URL allow-list、CSP、输入边界和分级限流 | `tests/security-boundaries.test.js`、`tests/http-integration.test.js` |
| 质量门禁 | GitHub CI 跑语法和 Node 测试；独立 Chromium job 跑 48 组视觉页面；6,263 项目合成库阻断存储性能回退 | `.github/workflows/ci.yml`、`npm run release:check`、`npm run perf:storage:fixture` |

## 6K 级存储基准

命令：`npm run perf:storage`

本轮样本：6,263 个项目、11 个方案、120 条扫描、60 份榜单归档。

| 指标 | 本轮结果 | 当前预算 |
|---|---:|---:|
| SQLite 冷加载 | 298-377 ms | 2,500 ms |
| 当前方案项目列表 | 96-101 ms | 1,500 ms |
| 当前方案摘要 | 196-210 ms | 2,500 ms |
| 核心快照 | 419 KB | 2 MB |
| 250 项目分页 | 1.21 MB | 4 MB |
| 10 榜单分页 | 798 KB | 2 MB |
| 单条增量写入 | 314-349 ms | 2,000 ms |
| Node heap used | 约 235-238 MB | 观察项，不设硬门槛 |

这些数据证明当前 6K 规模已经脱离整包 JSON 的主要瓶颈，但不能外推到无限规模。Node 仍会在启动时把项目装入内存，数万项目后应继续把筛选、排序和摘要下推到 SQL。

## 泛化能力的正确表述

当前方法不再为 CAD、UGNX、Photoshop、CRM 等领域写运行时固定词表。统一流程是：

1. 只以方案名称和详细需求为事实基准。
2. 让模型先形成领域概念、别名、标准、格式、生态工具和 GitHub 可检索实体。
3. 每条 query 必须包含当前领域锚点，不能只使用 app/tool/workflow 等泛词。
4. 可见 customQueries 与实际执行 profiles 必须一一对应，最多 30 条，不强行补满。
5. 质量门失败时最多修复两次，仍失败则拒绝保存，不使用历史领域 fallback 糊弄用户。
6. 用 LoRaWAN、FHIR、OpenType、ROS 2、IFC、OpenTelemetry、KiCad、WebAuthn、FITS、FASTQ 覆盖协议、行业标准、创意技术、机器人、工程、云原生、硬件、安全和科研等不同结构。

这只能证明方法对一组多样化陌生领域保持一致，不等于证明所有未来输入。真实模型、模型版本和上游搜索都会变化，因此 `npm run audit:plans:live -- --cases-file <file>` 是持续门禁，不是一次性验收。

## 仍需明确接受的风险

- Node 和浏览器密钥当前是本机明文静态数据；源码公开不泄露密钥，但设备失守时无法提供 Keychain/Secret Manager 级保护。
- 任务恢复会重新执行未完成任务，不是从单个 GitHub 请求中间断点续传。
- 应用限流不能替代 CDN/WAF 的 DDoS 和 Bot 防护。
- AI 方案与分析仍需真实 Provider 抽样；自动测试只能验证结构和失败边界。
- GitHub 真实 Star/Fork、secondary rate limit、趋势缓存和账号仓库路径必须用专用测试账号完成最终验收。
- 公开前端源码无法靠禁用 F12 或动态加载真正隐藏，保护手段是许可证、服务端边界、密钥不下发和侵权取证。

## 发布前命令

```bash
npm run release:check
npm run perf:storage
git status --short
git status --ignored --short
```

然后人工确认：

- Git 历史中没有 `.env`、`data/`、`output/`、Token、Key、二维码或用户数据。
- 使用无效 Token 时扫描立即停止；使用有效 Token 时完整扫描可完成。
- 使用真实 AI Key 对新增领域 cases 做 live audit。
- 公网部署方案满足 [SECURITY.md](SECURITY.md) 的最低要求。
