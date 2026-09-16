# 星仓印记发布复盘

更新日期：2026-09-16

本文记录本轮 P0/P1 整改的证据、仍然存在的边界，以及“可以上传源码”和“可以直接公开部署”之间的区别。

## 结论

- 源码治理：具备 Git 基线、自动化测试、视觉回归、敏感文件忽略和可审查 diff，可以进入公开仓库前的最终密钥检查。
- 本地产品：SQLite、IndexedDB、方案隔离、学习驱动发现和持久化任务已经达到个人本地使用基线。
- Web 静态模式：适合无账号、本地数据留在浏览器的部署方式，可作为 GitHub Pages 在线体验直接发布 `public/`；示例数据使用真实 GitHub 公开元数据，不携带任何 Key。
- Node 公网服务：不能裸端口上线。只有置于 TLS、认证网关、CDN/WAF、审计和 Secret Manager 后才进入可评估范围。
- 任意领域：当前建立了通用生成契约和多领域证据，不能宣称对所有可能输入都已证明正确。

## 静态在线体验与 Node 公网服务

两者是不同的交付形态，验收标准不能混用。

| 维度 | GitHub Pages 静态在线体验 | Node 公网服务 |
|---|---|---|
| 发布内容 | `public/` 静态产物（HTML/CSS/JS + 示例快照） | `src/server.js` 及后端数据层 |
| 账号与隔离 | 无账号、无租户隔离，数据只在访客浏览器 IndexedDB | 同样没有账号体系，必须外接认证网关与权限模型 |
| 密钥位置 | 访客浏览器 IndexedDB，仅浏览器直连服务商 | 服务端存储，发布前必须迁到 Secret Manager |
| 首屏数据 | 空工作区首次读取时装载 `demo-content` 示例方案与 25 个真实公开仓库 | 空库保持空项目池 |
| 主要风险 | 前端源码公开、数据可被访客自行修改、示例元数据会随时间变旧 | 裸端口暴露、密钥托管、DDoS、审计与合规 |
| 当前结论 | 可以发布 | 不满足最低公网要求前不可发布 |

静态版的自动化证据：`tests/local-api.test.js` 覆盖快照 schema、25 个唯一公开仓库、无凭据字段、空库首次装载、已有数据跳过、并发只装载一次、Pages 子路径解析、静态部署直接路由 IndexedDB、缺失快照降级，以及对携带凭据字段快照的拒绝；`npm run check:static` 在 Chromium 中用 `/starvault-imprint/` 子路径跑桌面与移动端无后端验收、刷新去重、资源 200 和横向溢出检查；`tests/security-audit.test.js` 覆盖密钥扫描能发现仅存在于 Git 历史的 Token 与敏感路径；`.github/workflows/pages.yml` 在 `main` 推送后跑 `npm run ci`、`npm run check:static` 再发布 `public/`。

## 本轮整改证据

| 事项 | 实现 | 自动化证据 |
|---|---|---|
| 默认方案污染 | 项目保存方案归属；默认池排除 custom-only；切换扫描只替换目标方案；删除方案清理孤立项目 | `tests/observation-plan-query-limit.test.js` |
| Git 基线 | 初始提交 `bedb953`，后续升级保持在可审查工作树 | `git log`、`git status` |
| Node 存储 | SQLite WAL；项目、方案、扫描、方案关系按表写入；旧 JSON 不再被运行时修改 | `tests/sqlite-storage.test.js` |
| Web 存储 | IndexedDB v5；projects/plans/scans/leaderboards/taskArtifacts 分对象仓库；核心、项目、榜单分页和扫描 profile 临时结果分别同步 | `tests/indexeddb-storage.test.js`、`tests/local-api.test.js`、`tests/http-integration.test.js` |
| 泛化质量门 | 删除历史领域词包；统一元认知提示词；核心锚点、数量、语法、负向词证据、噪声和可执行一致性检查 | `npm run audit:plans:offline`、10 类陌生领域矩阵、`scripts/observation-plan-quality-audit.js` |
| 学习驱动发现 | 明确行为权重；默认方案可生成学习查询；自定义方案在域内调整 profile 顺序与候选预算；负向信号保留探索底线 | `tests/learning-driven-discovery.test.js`、`tests/local-api.test.js` |
| 长任务恢复 | scan/analysis/plan-generation 持久化；扫描 profile 级检查点；刷新继续轮询；重启重新排队；最多重试 3 次；结果绑定创建时方案 | `tests/durable-tasks.test.js`、`tests/local-api.test.js` |
| 公网应用边界 | 非 loopback 强制 AUTH_TOKEN；Origin、可信代理、SSRF、URL allow-list、CSP、输入边界和分级限流 | `tests/security-boundaries.test.js`、`tests/http-integration.test.js` |
| 质量门禁 | GitHub CI 跑语法和 Node 测试；独立 Chromium job 跑 48 组视觉页面；静态 Pages 验收跑子路径、无后端与移动端；6,263 项目合成库阻断存储性能回退 | `.github/workflows/ci.yml`、`.github/workflows/pages.yml`、`npm run release:check`、`npm run check:static`、`npm run perf:storage:fixture` |

## 6K 级存储基准

命令：`npm run perf:storage:fixture`

本轮 CI 合成样本：6,263 个项目、11 个方案、120 条扫描、60 份榜单归档。

| 指标 | 本轮结果 | 当前预算 |
|---|---:|---:|
| SQLite 冷加载 | 54.8 ms | 2,500 ms |
| 当前方案项目列表 | 1,218.4 ms | 1,500 ms |
| 当前方案摘要 | 849.7 ms | 2,500 ms |
| 核心快照 | 106,448 B | 2 MB |
| 250 项目分页 | 284,350 B | 4 MB |
| 10 榜单分页 | 18,195 B | 2 MB |
| 单条增量写入 | 69 ms | 2,000 ms |
| Node heap used | 133.7 MB | 观察项，不设硬门槛 |

这些数据证明当前 6K 规模已经脱离整包 JSON 的主要瓶颈，但不能外推到无限规模。Node 仍会在启动时把项目装入内存，核心设置/任务等小体量状态仍以 JSON 字段保存在 SQLite 的 `app_state`，数万项目后应继续把筛选、排序和摘要下推到 SQL。

## 泛化能力的正确表述

当前方法不再为 CAD、UGNX、Photoshop、CRM 等领域写运行时固定词表。统一流程是：

1. 只以方案名称和详细需求为事实基准。
2. 让模型先形成领域概念、别名、标准、格式、生态工具和 GitHub 可检索实体。
3. 每条 query 必须包含当前领域锚点，不能只使用 app/tool/workflow 等泛词。
4. 可见 customQueries 与实际执行 profiles 必须一一对应，最多 30 条，不强行补满。
5. 质量门失败时最多修复两次，仍失败则拒绝保存，不使用历史领域 fallback 糊弄用户。
6. 用 LoRaWAN、FHIR、OpenType、ROS 2、IFC、OpenTelemetry、KiCad、WebAuthn、FITS、FASTQ 覆盖协议、行业标准、创意技术、机器人、工程、云原生、硬件、安全和科研等不同结构。

这只能证明方法对一组多样化陌生领域保持一致，不等于证明所有未来输入。离线矩阵只验证系统约束，真实模型、模型版本和上游搜索都会变化，因此 `npm run audit:plans:live -- --cases-file <file>` 是持续门禁，不是一次性验收。

## 仍需明确接受的风险

- Node 和浏览器密钥当前是本机明文静态数据；源码公开不泄露密钥，但设备失守时无法提供 Keychain/Secret Manager 级保护。
- 任务恢复会跳过已完成的扫描 profile；中断的单个外部 HTTP 请求仍会重试，不是从请求内部字节级续传。
- 应用限流不能替代 CDN/WAF 的 DDoS 和 Bot 防护。
- AI 方案与分析仍需真实 Provider 抽样；自动测试只能验证结构和失败边界。
- GitHub 真实 Star/Fork、secondary rate limit、趋势缓存和账号仓库路径必须用专用测试账号完成最终验收。
- 公开前端源码无法靠禁用 F12 或动态加载真正隐藏，保护手段是许可证、服务端边界、密钥不下发和侵权取证。
- `public/demo-snapshot.json` 是构建时抓取的真实公开元数据，Star/Fork 和最近提交时间会随时间变旧；对外展示前应重新运行 `node scripts/build-demo-snapshot.js` 刷新快照。
- 本机静态验收已覆盖 GitHub Pages 子路径，但最终线上域名、Pages 设置和部署产物仍以一次真实部署后的页面验收为准。

## 发布前命令

```bash
npm run release:check
npm run check:static
npm run perf:storage
npm run audit:secrets
git status --short
git status --ignored --short
```

然后人工确认：

- Git 历史中没有 `.env`、`data/`、`output/`、Token、Key、二维码或用户数据。
- 使用无效 Token 时扫描立即停止；使用有效 Token 时完整扫描可完成。
- 使用真实 AI Key 对新增领域 cases 做 live audit。
- 公网部署方案满足 [SECURITY.md](SECURITY.md) 的最低要求。
