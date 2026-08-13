# 星仓印记桌面端本地存储方案

本文档描述面向本地桌面应用的存储方案，并区分已经落地的数据层与桌面壳仍需完成的能力。当前 Node 运行时已经使用 SQLite WAL，Web 静态模式已经使用 IndexedDB v5；Mac 应用仍需补 Keychain、签名、公证和沙盒适配。

## 目标

- 桌面端支持长期、本地、离线优先保存项目池、观察方案、学习中枢、研判、AI 分析、隐藏项目、榜单归档和扫描记录。
- 密钥不落入业务数据库，GitHub Token、Tavily Key、Exa Key、AI Provider Key 统一进入系统安全存储。
- Web 端继续使用 IndexedDB v5，Node 与桌面端共享 SQLite 数据模型，桌面端密钥迁移到 Keychain。
- 导入导出继续使用不含密钥的 JSON，保证 Web、Node 本地、桌面端之间可以迁移用户数据。

## 推荐组合

| 场景 | 存储 | 密钥 | 说明 |
|---|---|---|---|
| Node 本地服务 | SQLite WAL | 当前在 SQLite 本机明文状态中 | 已实现，旧 JSON 只做迁移备份 |
| Web 静态部署 | IndexedDB v5 | 浏览器 IndexedDB 独立记录，导出时排除 | 已实现，适合无账号、纯本地保存 |
| Mac 桌面应用 | SQLite WAL | macOS Keychain | 数据层已实现，Keychain 和桌面壳待接入 |

桌面端不建议使用 MySQL、SQL Server、Supabase 作为默认存储。星仓印记是本地优先工具，没有账号系统时把用户行为、项目研判、AI 分析和偏好记忆放到远端数据库，会增加隐私、权限、合规和运维成本。SQLite 更适合单用户桌面应用。

## 数据位置

非沙盒桌面应用：

```text
~/Library/Application Support/StarVault Imprint/starvault.db
~/Library/Application Support/StarVault Imprint/backups/
```

Mac App Store 沙盒应用：

```text
~/Library/Containers/com.starvault.imprint/Data/Library/Application Support/StarVault Imprint/starvault.db
```

建议同时保存一个只含元信息的状态文件：

```text
storage.json
```

示例：

```json
{
  "storage": "sqlite",
  "schemaVersion": 1,
  "database": "starvault.db",
  "secrets": "macos-keychain",
  "lastBackupAt": ""
}
```

## 数据分层

桌面端采用“结构化索引 + JSON 原文”的混合模型。

- 高频筛选字段结构化：项目名、语言、许可、Star、Fork、更新时间、分类、用途、方案 ID。
- 复杂对象保留 JSON：评分细节、AI 分析结果、学习中枢上下文、Provider 目录、扫描摘要。
- 所有项目、方案、研判和记忆都要能从 SQLite 无损恢复为 portable JSON / IndexedDB snapshot 的数据形态。

这样做能减少迁移风险：查询速度比大 JSON 文件稳定，同时不会因为过早拆表破坏现有业务结构。

## 密钥策略

SQLite 中不保存任何真实密钥，只保存配置状态和 Keychain 引用。

macOS Keychain 建议：

| Keychain service | account | 内容 |
|---|---|---|
| `StarVault Imprint` | `githubToken` | GitHub Token |
| `StarVault Imprint` | `tavilyKey` | Tavily API Key |
| `StarVault Imprint` | `exaKey` | Exa API Key |
| `StarVault Imprint` | `llmProvider:<providerId>:apiKey` | 单个 AI Provider Key |

导入导出规则：

- 导出配置、观察方案、学习中枢、项目池、研判、AI 分析、隐藏项目、榜单归档。
- 不导出任何 Keychain 密钥。
- 导出文件可包含 `githubConfigured: true` 这类状态，但不能包含真实值。
- 导入后用户需要重新填写或授权读取本机 Keychain。

## 迁移路径

### 从旧 Node 本地 JSON 迁移

1. 读取 `data/store.json`。
2. 使用现有 storage normalize 逻辑生成规范化 store。
3. 保留原始 `store.json` 不变，作为人工回退来源。
4. 业务数据写入 SQLite。
5. 真实密钥写入 Keychain。
6. SQLite 中只保存密钥配置状态和 Keychain account 名称。
7. 校验项目数、方案数、扫描数、研判数、AI 分析数、隐藏项目数、学习事件数。

### 从 Web IndexedDB 迁移

1. Web 端导出 portable JSON。
2. 桌面端导入 portable JSON。
3. 按 schema 写入 SQLite。
4. 因 portable JSON 不含密钥，用户在桌面端重新配置 GitHub、Tavily、Exa 和 AI Key。

### 回滚

首次启用 SQLite 时不删除原始 `data/store.json` 或导入文件。当前 Node 迁移已经遵循这一规则；桌面端仍应保持相同行为。

## 运行策略

- 启动时打开 SQLite，执行 migration，设置 `PRAGMA foreign_keys = ON`。
- 使用 WAL 模式，降低长扫描写入时的读取阻塞。
- 扫描、AI 分析、方案生成等长任务写入必须使用事务。
- 大批量项目写入使用分批事务，避免一次性占用 UI 线程。
- UI 线程只调用桌面 IPC/API，不直接执行 SQLite 大查询。
- 项目池列表使用分页、摘要字段和缓存，不把完整项目池一次性送到前端渲染。

## SQLite PRAGMA 建议

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA wal_autocheckpoint = 1000;
```

## 核心表

完整 schema 草案见 [desktop-storage-schema.sql](desktop/desktop-storage-schema.sql)。

| 表 | 用途 |
|---|---|
| `schema_migrations` | 记录 schema 版本 |
| `app_meta` | 应用级元信息 |
| `settings` | 非密钥设置和 Provider 配置状态 |
| `secret_refs` | Keychain 引用，不保存密钥 |
| `observation_plans` | 观察方案、检索逻辑、方案记忆快照 |
| `plan_requirements` | 方案已记录需求 |
| `projects` | 项目池主表，含筛选索引字段和原始 JSON |
| `plan_project_state` | 每个方案下的收藏、研判、AI 分析、隐藏、GitHub 状态 |
| `memory_events` | 学习中枢行为事件 |
| `scans` | 扫描批次 |
| `scan_items` | 扫描命中的项目关系 |
| `leaderboards` | 榜单归档 |
| `leaderboard_items` | 榜单条目 |
| `summary_cache` | 项目池摘要缓存 |

## 兼容边界

桌面端 SQLite adapter 必须实现与当前 storage 模块等价的数据能力，至少覆盖：

- 项目池读取、分页、筛选、摘要统计。
- 项目详情、收藏、取消收藏、隐藏、恢复、研判记录、AI 分析。
- GitHub Star、Unstar、Fork 的本地状态缓存。
- 观察方案新增、预览、保存、删除、切换和重新扫描。
- 方案级学习中枢：行为事件、长期偏好、负向偏好、上下文压缩、反信息茧房参数。
- 榜单生成、归档和反馈。
- portable JSON 导入导出，且排除密钥。

## 桌面端适配器边界

接入桌面壳时应保留统一接口：

```text
StorageAdapter
  getSettings()
  saveSettings(settings)
  getProjects(query)
  getProject(fullName)
  saveProjects(projects, scanContext)
  getObservationPlans()
  saveObservationPlan(plan)
  activateObservationPlan(planId)
  getPlanUserData(planId)
  savePlanUserData(planId, patch)
  addMemoryEvent(planId, event)
  exportPortableData()
  importPortableData(snapshot)
```

当前 Node 版由 `src/lib/storage.js` 和 `src/lib/sqlite-store.js` 提供；桌面壳应复用同一能力边界，避免前端业务逻辑分叉。Node 的项目、方案、扫描和方案关系是记录级 SQLite 数据，小体量设置、任务和运行状态仍可作为 JSON 字段保存；这不是把大型项目池重新整包写入 JSON。

## 备份与恢复

- 每次 destructive 操作前可生成轻量备份：删除方案、清除学习记录、导入覆盖配置。
- 定期备份 SQLite 时使用 SQLite Online Backup API，避免直接复制正在写入的数据库文件。
- portable JSON 是跨平台迁移格式，不替代 SQLite 本地备份。
- 备份同样不包含 Keychain 密钥。

## 验收标准

桌面端启用 SQLite 前必须验证：

- 从 `data/store.json` 导入后，项目数、观察方案数、学习事件数、收藏数、研判数、AI 分析数、隐藏项目数一致。
- 默认观察方案和用户自定义方案可正常切换，切换后按对应检索逻辑重新扫描。
- 扫描完成后项目池、榜单、结构看板、学习中枢结果一致。
- Star、Unstar、Fork、收藏、隐藏、恢复、研判保存、AI 分析不会触发页面异常跳转。
- 导出 JSON 不包含 GitHub Token、Tavily Key、Exa Key 或 AI Provider Key。
- 数据库文件增长后项目池首页仍能快速打开，列表分页不一次性渲染全量项目。
- 应用异常退出后 SQLite 不损坏，重启可继续读取。

## 当前落地状态

- 已完成：Node SQLite WAL、旧 JSON 一次性迁移、项目/方案/扫描记录增量写入、方案归属索引、持久化任务、Web IndexedDB v5 记录级存储、分页同步和扫描 profile 临时恢复。
- 已完成：portable export、核心快照、项目分页和榜单分页排除密钥。
- 待完成：macOS Keychain、桌面 IPC 权限边界、应用签名、公证、沙盒 entitlement、自动更新和 SQLite 在线备份界面。
- 当前 SQLite runtime schema 位于 `src/lib/sqlite-store.js`；`desktop/desktop-storage-schema.sql` 是更细粒度桌面长期演进草案，不应误认为已经全部启用。
