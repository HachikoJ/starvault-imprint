# StarVault Imprint 彻底审查报告

审查日期：2026-10-08（Asia/Shanghai）  
项目目录：/Users/wilson/Documents/Codex/StarVault Imprint  
基线提交：d20b69d8bf44cbbb5b38ec86472f18ed6f660192  
线上入口：https://starvault.deline.top/  
审查性质：只读审查；未修改业务代码、真实工作区数据，未提交、发布或执行生产变更。

## 1. 审查结论

**当前版本不宜被判定为可以放心扩大使用的稳定产品。首要阻断项是数据一致性，而不是界面完成度。** 正常操作即可出现“保存成功，稍后丢失”：浏览器后台任务覆盖新笔记、Node 离线回退后丢失离线编辑、SQLite 陈旧缓存覆盖其他 writer。扫描还有破坏其他方案关联、在部分上游失败时移除有效旧项目的问题。

未确认 P0 级任意执行、全站凭据泄漏或生产数据已被攻破。不能据此推断不存在此类漏洞。下面列出 **23 个真实缺陷或有直接证据的风险，以及 3 个明确标记的设计建议**。其中上游 TLS 校验是条件性高危风险，需要生产 nginx 的有效配置进一步确认；其余高优先级数据完整性问题已在隔离环境复现。

现有自动化门禁最终全部通过，仍未覆盖本次发现的主要业务不变量。第一次 CI 和第一次静态验收各出现一次失败，重跑通过，报告保留这段事实，没有将其编造成确定业务缺陷。

### 严重程度与可信度定义

- **P0 / 致命**：可直接导致大范围不可恢复损失、重大凭据泄漏或任意执行；本次没有确认。
- **P1 / 高**：核心数据静默丢失、方案隔离被破坏，或具备明确条件的高影响凭据风险；应优先处理。
- **P2 / 中**：核心结果不可信、特定受支持路径不可用、重复成本、可用性或发布可靠性问题。
- **P3 / 低**：局部指标错误或功能承诺与实际能力不一致。
- **设计建议**：存在取舍，不能当作必须修复的缺陷。

“已实际验证”后注明环境：真实 Chromium、真实 SQLite、本地 HTTP socket，或离线 mock/fake-indexeddb。mock 验证不等于已经在线上或真实供应商复现。“有证据但未复现”只说明代码/契约证据充分，不声称事故发生。

## 2. 实际功能、环境与核心路径

这是面向个人的 GitHub 项目观察与研判工具，核心资产是观察方案、项目成员关系、笔记、收藏、AI 研判和学习偏好。业务路径是：

1. 创建/选择观察方案，生成或配置检索策略。
2. GitHub Search/Trending 发现候选；Tavily/Exa 补充网页信号。
3. 分类、评分、入池，刷新趋势，生成榜单和日榜档案。
4. 浏览、筛选、收藏/隐藏、记录研判；显式行为写入学习记忆。
5. AI 研判根据用户需求输出风险、边界、实践启发、下一步验证。
6. 使用个人 Token 执行 GitHub Star/Unstar/Fork；导出项目池或配置与学习数据。
7. 长任务中断后恢复，Node 模式支持定时扫描。

### 两条运行路径

| 路径 | 业务执行与存储 | 凭据/外部请求 | 本次核验 |
|---|---|---|---|
| 公网静态站 | public/app.js + local-api.js；IndexedDB v5；无 Node 业务后端 | GitHub/Tavily/AI 浏览器直连；Exa 经 nginx /api/exa/search；Key 明文存本浏览器 | 真实 Chromium 打开；页面与 runtime-config 200；api/config 404；关键 JS 哈希与本地一致 |
| 本地 Node | 原生 node:http；src/server.js；SQLite WAL；内存缓存；持久任务队列最大并发 2 | Node 调用供应商；Key 存 SQLite；默认监听 127.0.0.1；非 loopback 要求 AUTH_TOKEN | 临时 DB/隔离服务测试；真实 SQLite、Chromium 和 socket 验证 |
| GitHub Pages 镜像 | 静态产物位于子路径 | Exa 指向主站代理 | 本地模拟子路径验收；未核验镜像当前线上版本 |
| CLI 扫描 | scripts/run-scan.js 直接打开 STORE_PATH | 读取环境配置，独立扫描入口 | 源码审查；未运行真实 CLI 扫描 |

没有把“公网 Node 多租户服务”当成既有产品契约，没有因缺账号体系或租户隔离给静态单用户产品制造缺陷。也没有将明文 IndexedDB/SQLite 本身当作未披露漏洞：README 与 SECURITY.md 已说明该边界。

### 线上只读证据

2026-10-08 10:20—10:25（北京时间）：

- HTTPS 首页 200；HTTP 首页 301；/.env 403；/data/store.json 404；/api/config 404。
- runtime-config 明确 static，Exa 代理路径为 /api/exa/search。
- 响应带 HSTS、CSP、nosniff、frame/referrer/permissions 限制。CSP 允许 script-src 'unsafe-inline'。
- app.js、local-api.js、indexeddb-storage.js 的线上/本地 SHA-256 分别相等。说明本次浏览器逻辑发现适用于当前线上脚本；不说明所有服务器配置相同。
- 新浏览器出现 25 个示例项目、示例方案和榜单；桌面和 390×844 移动视口可打开，页面无横向溢出。导航、设置和示例浏览均可到达。
- 未提交真实 Token、未运行付费搜索/AI、未执行 GitHub 账户写操作、未压测生产。

## 3. 发现总表（按优先级排序）

| 编号 | 严重程度 | 发现 | 主要范围 | 可信度 |
|---|---|---|---|---|
| A-01 | P1 高 | 后台旧快照覆盖已保存笔记；多 tab 缓存也会丢更新 | 浏览器 | 离线逻辑实证 |
| A-02 | P1 高 | Node 断连自动切本地，恢复后丢弃成功保存的离线编辑 | Node UI + IndexedDB | 真实 Chromium 实证 |
| A-03 | P1 高 | SQLite 用主库 mtime 判断缓存新鲜度，WAL 更新被漏掉并覆写 | Node/CLI | 真实 SQLite 实证 |
| A-04 | P1 高 | 部分检索失败仍整池替换，移除失败分区有效旧结果 | 两端扫描 | 浏览器 mock 实证；Node 源码证据 |
| A-05 | P1 高 | 新方案扫描擦掉共享仓库的其他方案关联 | IndexedDB | 离线逻辑实证 |
| A-06 | 条件性 P1 高 | Exa 代理未显式校验上游 TLS 证书 | nginx | 有证据；生产继承配置未核验 |
| A-07 | P2 中 | 多 tab 重复执行同一任务，重复付费请求与扫描 | 浏览器任务 | 离线 mock 实证 |
| A-08 | P2 中 | 无有效 AI 结果仍成功保存并给出研判建议 | 两端 AI | 离线 mock 实证 |
| A-09 | P2 中 | 两端同名分数/风险定义不同，同输入逆转排序 | 两端评分 | 真实计分函数实证 |
| A-10 | P2 中 | 任意扫描间隔差值被称为上一自然日增长 | 浏览器趋势 | 完整扫描 mock 实证 |
| A-11 | P2 中 | Tavily/Exa 失败被当作正向证据和提分信号 | Node enrichment | 两种 provider mock 实证 |
| A-12 | P2 中 | HTTP deadline 在响应头后失效；浏览器 AI 也缺请求期限 | 外部请求 | Node socket 实证；浏览器缺边界源码证据 |
| A-13 | P2 中 | analysis 去重 key 缺方案/需求，复用错误任务 | 两端任务 | 浏览器 mock 实证；Node 源码证据 |
| A-14 | P2 中 | 恢复 A 扫描却把当前 B 榜单写入 A 档案 | 浏览器恢复 | 完整扫描 mock 实证 |
| A-15 | P2 中 | 先截断队列再过滤，冷却扫描阻塞可运行 analysis | Node 调度 | 原调度函数实证；完整 UI 时序未复现 |
| A-16 | P2 中 | AUTH_TOKEN 模式缺认证入口，导出绕过认证头 | Node UI | 真实 Chromium/API 实证 |
| A-17 | P2 中 | 发布报失败后不回滚已切换的前端版本 | 部署 | 有证据但未执行部署 |
| A-18 | P2 中 | CSV 导出保留不可信公式单元格 | 两端导出 | 浏览器 CSV 实证；未执行电子表格公式 |
| A-19 | P2 中 | 声明 Node >=22.8，但 SQLite 在该版本需额外启动参数 | 安装/启动 | 官方版本契约 + 源码；未运行 22.8 |
| A-20 | P2 中 | 浏览器 API base 含 /v1 时重复拼接 | 浏览器 Provider | 请求 URL mock 实证 |
| A-21 | P2 中 | 页面称 MIT，与实际非商业许可冲突 | 对外契约 | 源码与线上页面实证 |
| A-22 | P3 低 | Watch 实际取 Stars 字段，社区项重复计分 | GitHub 元数据/评分 | 转换与评分实证 + 官方契约 |
| A-23 | P3 低 | 静态模式承诺自动扫描 08:00，实际无调度执行者 | 静态 UI | 线上文案 + 完整运行路径源码证据 |

下面每项只报告独立根因。同一根因的两个症状合并；修复某一项不能视为其他项自动解决。

## 4. 高优先级发现

### A-01 — 旧快照整对象保存导致用户数据静默丢失

**位置**：public/local-api.js:185 saveSnapshot、:304 requireSnapshot、:2140 analyzeProjectWithModel、:2535 startLocalTask（:2565、:2575）；public/indexeddb-storage.js:262 persistSnapshotWithDb（:289–329）、:503 getSnapshot。

**证据与触发**：启动 AI analysis，挂起模型响应；期间用 /api/note 保存笔记并从 DB 读回确认存在。释放模型响应，任务完成后该方案 userData.notes 变成空对象。任务持有开始时的克隆快照，之后保存全体 plan/core，将期间的新数据撤销。另两个 tab 共用同一 DB：A 保存 language=en，已缓存旧快照的 B 仍读旧值，B 再保存其他设置后 en 消失。IndexedDB 的单次事务原子性不保证跨请求的读改写一致。

**影响**：正常单 tab 使用即可丢笔记；同机制可能覆盖收藏、切换、新增方案、偏好和任务记录。用户已收到成功反馈，事后看不到冲突提示。跨 tab 延伸和单 tab 长任务合并于同一根因。

**修复**：按 task、plan、userData、settings 的记录/字段事务更新；外部异步请求完成后重新读取最新记录，只提交对应结果。整包导入/替换用 revision + compare-and-swap；BroadcastChannel 用于通知缓存失效，不能替代 DB 版本检查。不要用包住整个网络请求的大锁修复。

**严重程度**：P1，高。核心用户资产无提示丢失，触发不依赖恶意或稀有输入。  
**可信度**：已实际验证，独立 vm + fake-indexeddb；未冒称真实浏览器多 tab 线上复现。  
**复验验收**：挂起 AI 时分别保存笔记/收藏/新增方案，任务完成后均保留；两个 tab 修改不同字段均保留，修改同字段要有明确冲突策略。

### A-02 — 自动回退到另一数据源，恢复后离线编辑被丢弃

**位置**：public/app.js:4774 api（:4789–4807 自动 activateLocalMode）、:4826 restoreServerApiMode、:5278 左右 refreshIndexedDbSnapshot（:5297 服务端快照写本地）、:10303 loadAll；public/local-api.js:185 saveSnapshot。

**证据与触发**：在临时 Node 服务和真实 Chromium 中完成首次快照同步；仅模拟 /api/note 网络失败。api() 自动启用 IndexedDB，保存笔记返回成功，本地 notes 中确有 saved offline note。恢复网络并重新加载、执行正常快照同步后，local=false，notes={}。服务端从未收到这条笔记，也没有待重放写入队列。

**影响**：本地 Node 服务短暂断开、电脑休眠/服务重启时，用户会以为编辑已正常保存；恢复服务后记录失踪。和 A-01 不同，这里即使每个 DB 内部完全事务正确，两个权威数据源自动切换且无合并仍会丢数据。请求响应丢失时还不能据网络异常判断服务端是否已执行，重放具有副作用的操作应另行处理幂等。

**修复**：先明确 IndexedDB 是只读缓存还是可写离线副本。最低风险方案：Node 模式写入失败明确报失败，保持原数据源，缓存只用于离线阅读。需要离线编辑时，实现带 operationId、dirty 状态和冲突策略的 outbox，确认重放后才清除；未同步本地变更不得被服务端快照替换。UI 要区分已同步/仅本地保存。

**严重程度**：P1，高。普通连接故障导致用户编辑丢失，成功提示不真实。  
**可信度**：已实际验证，真实 Chromium + 临时 Node/SQLite；只用模拟网络错误和假数据。  
**复验验收**：断连编辑后恢复、刷新，不丢记录；明确展示待同步状态或失败；响应丢失与重复发送不会造成额外外部副作用。

### A-03 — SQLite WAL 与 mtime 缓存不兼容，其他 writer 的更新可被覆盖

**位置**：src/lib/storage.js:4006 load、:4025 save；src/lib/sqlite-store.js:69 createSchema（WAL）、:192 起 core 保存；scripts/run-scan.js:22 同 STORE_PATH 的独立入口。

**证据与触发**：两个 createStorage 实例 A/B 打开同一临时 DB 并预热缓存。A 写 runtime.a，主 .db 文件 mtime 前后完全相同，B 读 a=null。B 写 runtime.b 后，以新实例读真实 DB，只剩 b，a 消失。实际使用 Node SQLite/WAL。

SQLite 将未 checkpoint 的提交写在 WAL，主库文件的 mtime 不是数据版本。官方说明见 [SQLite WAL](https://www.sqlite.org/wal.html)；多连接版本检查可参考 [PRAGMA data_version](https://www.sqlite.org/pragma.html#pragma_data_version)。

**影响**：server 与 CLI 或多个 writer 共用数据库，读到陈旧缓存并覆写较新的 core/plan。SQLite 事务只保证本次提交原子，不能修复已经陈旧的提交内容。严格单 writer 可限制触发，但代码与公开 CLI 没有强制该约束。

**修复**：确定单 writer，让 CLI 通过服务 API 执行；或使用 DB revision/data_version 检测外部更新，把读改写放入事务并做版本检查，改成按记录写入。只检查 WAL 文件 mtime 也不是完整正确性方案。

**严重程度**：P1，高。支持的入口可能共用真实数据文件，能静默丢失其他 writer 更新。  
**可信度**：已实际验证，两 storage 实例真实 SQLite；完整 server+CLI 并发时序未单独执行。  
**最小复现**：

    const {createStorage}=require('./src/lib/storage');
    const a=createStorage('/tmp/unique-audit.db'); a.load();
    const b=createStorage('/tmp/unique-audit.db'); b.load();
    a.setRuntimeState('a',{value:'keep'});
    console.log(b.getRuntimeState('a')); // null
    b.setRuntimeState('b',{value:'keep'});
    console.log(createStorage('/tmp/unique-audit.db').load().runtime);
    // a 已被后续旧快照覆盖；请只对全新测试库运行

### A-04 — 部分检索失败被解释成项目不再匹配，删除有效旧结果

**位置**：public/local-api.js:1839 browserSearchProfile 错误收集、:1904 完全失败判定、:1991 replaceProjectsForPlan；src/server.js:3044–3063 replaceObservationPlanMatches；src/lib/storage.js:4832–4845 旧成员移除。

**证据与触发**：方案有 alpha 与 error-domain 两个 query。alpha 成功返回一个项目，error-domain 模拟 502；方案原有 error-domain 的有效项目。本轮任务完成、scan.status=completed-with-errors，池只剩 alpha，旧 error-domain 项目被移除。Node 使用 enriched.length > 0 || !scanErrors.length 决定整池替换，有相同逻辑。

**影响**：短暂上游故障裁掉本应保留的项目，影响收藏、研判可达性与历史观察。缺少结果不等于存在项目已失效的证据。即使 API 都成功，分页/上限样本也不应被无说明地当成完整仓库存在性判断；后者是否符合“当前发现池”设计需明确契约。

**修复**：记录 profile 执行状态和覆盖完整性；只撤销完整成功分区的成员，失败分区保留旧结果并标 stale。暂时无法分区时，只要有检索错误就增量 upsert，不移除旧成员。

**严重程度**：P1，高。正常外部失败触发既有数据关系丢失。  
**可信度**：浏览器完整扫描 mock 已实际验证；Node 同根因有直接源码证据，未执行完整 Node 外部扫描。  
**复验验收**：混合成功/失败、分页失败、限流和全失败均不将未验证缺失当删除依据；榜单标注本轮覆盖不完整。

### A-05 — 扫描新方案会擦掉共享仓库的其他方案关联

**位置**：public/indexeddb-storage.js:740 replaceProjectsForPlan，:748–753 仅查询当前方案成员，:773–792 覆盖 incoming 全局项目记录；public/local-api.js:1991 调用点。

**证据与触发**：acme/shared 原属 default；扫描 newplan 得到同仓库，执行替换。保存后 observationPlanMatches 只有 newplan，default 项目池为空。incoming 的旧全局行没有被读取，因为它尚不属于 newplan。

**影响**：B 的扫描使 A 的项目消失；失去历史快照/firstSeenAt 等旧数据也可能发生。随后删除 B 可能把唯一全局项目行移除，而 A 的学习/笔记仍引用该仓库。

**修复**：用同一个 readwrite 事务按 key 读取所有 incoming 的旧全局行，合并其他方案关联；当前方案索引只用于撤销当前方案过时成员。

**严重程度**：P1，高。正常多方案使用破坏数据隔离与成员关系。  
**可信度**：已实际验证，fake-indexeddb。  
**复验验收**：同仓库先后命中 A/B，两者均保留；重扫/删除任一方案不影响另一方案的成员和已有项目历史。

### A-06 — Exa 凭据转发缺少显式上游 TLS 身份校验

**位置**：deploy/nginx/starvault.deline.top.conf:90–100，proxy_ssl_server_name on / proxy_pass https://api.exa.ai/search。

**证据**：仓库配置没有 proxy_ssl_verify on、CA 信任文件。nginx 默认 proxy_ssl_verify off；设置 SNI 不等于校验证书。见 [nginx 官方 proxy_ssl_verify](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ssl_verify)。

**触发与影响**：如果生产上级配置也未开启校验，服务器 DNS/路由/连接遭劫持时可接受伪造上游，将访客 x-api-key 和搜索内容发给错误接收方。只看到 HTTPS URL 不能证明上游身份被验证。

**修复**：先读取生产有效 nginx -T 确认继承；该 location 显式设置 proxy_ssl_verify on、系统 CA、适当 verify_depth 和 proxy_ssl_name api.exa.ai。隔离测试应确认错误域名/自签证书被拒绝。

**严重程度**：条件性 P1，高。若生效配置确实关闭校验，影响访客付费凭据。  
**可信度**：有证据但未复现。未读取生产 nginx -T，不能排除全局继承已开启；未做 MITM，不能称线上已经不校验证书。

## 5. 中优先级发现

### A-07 — 同一运行中任务可在多个 tab 被重复执行

**位置**：public/local-api.js:52 localTaskPromises、:2535 startLocalTask、:2564–2565 执行前无共享认领、:3131/:3143 GET 任务触发恢复。

**证据与触发**：两个隔离 vm/tab 共用同一 IDBFactory。A 启动挂起 analysis；B GET 同一 task.id。相同 ID 的 model fetch 从 1 次变 2 次。去重 Map 仅属于 tab，running 状态不能区分尚活跃执行者和真正中断者。

**影响**：常见双 tab/恢复行为造成重复 AI 费用、GitHub 配额和并发 checkpoint 写入。它与 A-01 不同：即使结果提交事务正确，仍会重复外部调用。

**修复**：IDB 原子 owner/lease 认领与续租，或 origin 级 Web Locks；仅所有权失效时恢复。需要可取消任务、输出预算和明确的幂等边界。参考 [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)。

**严重程度**：P2，中。已证实重复外部调用，没有真实账单或无限成本事故证据。  
**可信度**：已实际验证，调用次数 mock；未运行真实供应商或真实 Chromium 多 tab。  
**复验验收**：双 tab 查询同一任务，只产生一次外部请求；持有者关闭后能安全恢复，不能依靠 tab 内 Map 判断存活。

### A-08 — 无有效 AI 交付仍显示完成并污染研判与学习

**位置**：src/lib/llm.js:412–483 风险/建议推导与 normalizeAnalysisResult、:1292–1328 analyzeOpenAICompatible；src/server.js:2536–2548 保存结果；public/local-api.js:2118–2137 normalizeBrowserAnalysis、:2173–2179 保存/学习。

**证据**：Node HTTP 200 的空 content、空对象、普通 overloaded 文本、finish_reason=length 的截断 JSON，均生成成功结果；低风险 fixture 得到 recommendation=validate、riskLevel=low。浏览器空对象同样被保存为 summary 为空、各段为空的 watch，并写 ai_analyze 事件。两端不是所有坏格式都相同通过，但均未要求有效业务内容。

**影响**：付费调用没有产生研判却显示成功；旧有效分析可能被无效结果覆盖，学习记录误记成功研判。本次没有证据显示这些建议会自动执行 GitHub 修改，不能扩大为自动破坏。

**修复**：先验收业务 schema、枚举、非空 summary 和必需段落，再归一化展示。缺正文/拒答/无效截断应失败或“未形成结论”，不能按本地风险补出积极推荐。只有有效结果才保存和写学习事件。完整但被 length 标记的 JSON 可按业务内容验收，不机械全拒。

**严重程度**：P2，中。核心产品交付假成功、推荐和历史记录被污染。  
**可信度**：已实际验证，两端离线响应 mock；未调用真实模型。  
**复验验收**：上述坏响应不产生成功研判、不覆盖旧记录、不增加学习成功事件。

### A-09 — 浏览器和 Node 的同名指标不一致，榜单可因运行环境逆转

**位置**：public/local-api.js:1455–1483 browserProjectScores、:1486 githubRepoToProject；src/lib/scoring.js:1135–1321 scoreRepository，尤其 productFit、projectRisk/overallRisk 定义。

**证据**：相同元数据（1500 Stars、150 Forks、MIT、主页、创建/更新时间）的两个 fixture：抽象 swarm 在 Node opportunity=40/productization=35，在浏览器 79/84；可自托管 notes 两端 opportunity=69。Node 的 abstractAgentPenalty=33，浏览器没有同样的产品形态判断，排序从 notes>swarm 变为 swarm>notes。无许可 widget 的 Node risk=6/overallRisk=38，浏览器 risk=51/overallRisk=51；同名 risk 实际含义不同。

**影响**：同一 UI/导出/偏好逻辑消费不可比较分数，迁移或换运行环境后像是项目质量变化。静态版与默认方案强调“实际产品形态”的契约不等价。不是认定 Node 权重天然更好，而是同名字段没有共同定义。

**修复**：共享纯评分/分类模块；或显式保存 scoringVersion、指标定义、来源和时间，禁止未经转换混排。项目风险/许可风险分别定义。用有业务差别的固定仓库案例验证两端契约。

**严重程度**：P2，中。主要排序和风险解释的语义不稳定。  
**可信度**：已实际验证，直接运行两套真实函数；没有现实推荐效果校准证据。

### A-10 — 数周增长被标为昨日增长

**位置**：public/local-api.js:1954–1989 runBrowserScan，:1971–1980 trend；public/app.js:1469–1470 排序文案、:4164 projectTrendHint。

**证据**：完整浏览器扫描 mock，上次扫描 30 天前 Stars=200，本次=250；保存 trend.stars=50、date=当天、complete=true，UI 固定称“前一日增量”/“上一自然日 Star 新增量”。同一天多扫也只取最近两次差值。Node 的上一日在线统计不能证明浏览器指标正确。

**影响**：将任意间隔增长当成单日爆发，误导趋势排序和用户判断。

**修复**：快照指标保存 intervalStart/intervalEnd/跨度，称“自上次扫描增长”；若要昨日指标，建立真正跨日基线或在线前一日统计，并标未知/不完整。时间窗口完整性不能简单等同“有上次记录”。

**严重程度**：P2，中。稳定错误描述核心趋势，不是时区偏好问题。  
**可信度**：已实际验证，完整扫描 mock + 独立 IndexedDB。

### A-11 — 服务失败反而成为正向证据

**位置**：src/lib/tavily.js:100–111、src/lib/exa.js:179–190；src/lib/scoring.js:1166 externalScore、:1295 externalMentions、:1359–1361 buildReasons；src/server.js:3025–3029 集成。

**证据**：模拟 401 后 enrichment 返回“enrichment failed”的 signal，url 为空、score=0；评分使用 Number(signal.weight || 1)，失败也加 4 novelty，28→32；externalMentions=1，解释称发现一条外部信号。本 fixture 的 opportunity 四舍五入后未变，不能说每次明显提高总分。

**影响**：无效 Key、限流或错误成为项目正向证据，污染解释和发送给 AI 的项目上下文。

**修复**：返回独立 signals 与 errors/status；失败数组不进评分。只计算成功、相关、有来源的证据；空结果与失败分开，错误进入扫描诊断。

**严重程度**：P2，中。错误被方向性地误读成成功证据。  
**可信度**：两种 provider 的 401 mock 均已实际验证。

### A-12 — 超时边界未覆盖请求完整生命周期

**位置**：src/lib/http-client.js:217–244，:233–237；src/lib/github.js:1126 response.text 与 Tavily/Exa 的 response.json。浏览器 public/local-api.js:2075–2115 callModelJson。

**证据**：原生 fetch 返回响应头后 immediately clearTimeout。真实本地 upstream 约 41ms 返回头、700ms 才返回正文；timeoutMs=250/retries=0，仍约 739ms 成功。浏览器 AI 请求捕获也确认没有 AbortSignal、没有输出 max_tokens 边界。

**影响**：慢正文超出声明的期限，任务槽和单扫描执行者长时间被占；浏览器任务可长期 running、后续同 key 请求继续复用。底层 HTTP 可能有自己的超时，不能说已经证明永久挂死。缺输出预算不等于已经产生异常账单。

**修复**：完整正文读取、字节上限、整体 deadline 放入每次尝试生命周期；浏览器 AI 加明确期限、取消和输出预算。分析/写请求超时后的重试需考虑供应商是否已执行，不能无脑重发。附带修正 http-client.js:81 mergeSignal 对已 aborted 输入不检查的问题。

**严重程度**：P2，中。核心长任务可靠性和资源边界失效。  
**可信度**：Node 正文超时与已取消仍发送已用 socket 实证；浏览器缺界限由请求捕获验证，未等待真实无限挂起/核算真实成本。

### A-13 — 任务去重忽略方案与分析需求

**位置**：public/local-api.js:3474 analysis key、:2599–2605 enqueueLocalTask；src/server.js:4121 analysis key、:2708–2714 enqueueDurableTask。

**证据**：default 用 A request 分析仓库，模型响应挂起；切 B 用 B request 分析同仓库，返回同 taskId，owner 仍 default，仅调用模型一次，B 无分析结果。key 只有仓库名；同方案不同需求也没有独立请求身份。

**影响**：用户指定的新需求被静默忽略，看到错误任务状态/结果。单用户不同方案隔离问题，不是跨用户凭据泄漏。

**修复**：key 至少含 planId；需求/method 纳入规范化哈希，或明确拒绝冲突并说明复用。复用前比较请求输入，结果显示与归属也校验。

**严重程度**：P2，中。执行了错误业务请求。  
**可信度**：浏览器完整 mock 实证；Node 同构源码证据，未单独端到端复现。

### A-14 — 扫描归属正确，但恢复生成的档案属于另一方案

**位置**：public/local-api.js:1868 runBrowserScan、:2009–2012 projectsForActivePlan/summary/buildLeaderboard、:2014–2020 按 owning plan 写 archive；:764、:1005 辅助读 activeId。

**证据**：当前 active=B，恢复 running scan A；GitHub mock 返回 alpha，任务归属与 A 项目池正确；A 日榜档案却写 observationPlan.id=b，items=[acme/beta]。

**影响**：历史榜单被其他方案项目/偏好污染，扫描成功提示掩盖错误档案。这不是 A-13 的 key 复用，也不依赖 A-01 的并发覆写。

**修复**：所有扫描派生计算显式传入 owning planId，读取对应项目、memory/userData；归档验证 planId 和项目归属，不通过切换全局 activeId 纠正。

**严重程度**：P2，中。核心历史结果错误。  
**可信度**：已实际验证，恢复扫描完整 mock。

### A-15 — 不可运行扫描占据截断后的候选队列

**位置**：src/server.js:2699–2705 pumpDurableTaskQueue、:2633–2644 startDurableTask；src/lib/storage.js:4084–4100 listTasks。

**证据**：按空槽数先 listTasks(limit)，之后才排除冷却扫描/跳过忙扫描。提取原生产 pump 函数，依赖替身给两条较新冷却扫描、一条较旧 analysis，空槽=2，started=[]。

**影响**：有空槽却不启动可运行的分析，GitHub 冷却影响其他任务。是否能在全部 UI 入口组合下形成该队列，尚未端到端复现。

**修复**：先检索足量候选、按可运行谓词筛选，再按空槽调度。覆盖冷却、扫描锁、有序公平性和扫描/分析混排。

**严重程度**：P2，中。条件满足时造成无谓等待与队列吞吐损失。  
**可信度**：原调度函数已实际验证；完整业务时序未复现。

### A-16 — AUTH_TOKEN 保护的 Node 模式没有正常登录入口，导出必然丢认证头

**位置**：public/app.js:4741–4784 get/setAuthToken 与 api、:12432–12444 导出；src/server.js:4313–4319 认证。

**证据**：setAuthToken 只有定义，没有调用；没有 Token 输入流程和认证 Cookie 发放。临时 AUTH_TOKEN 服务的真实 Chromium 全新上下文中，config/settings/plans 等 401，没有认证控件。手动设置正确 localStorage Token 后常规 API 200，实际点击 CSV 导出仍导航得到 401 JSON，因为 window.location.href 不携带 Bearer。

**影响**：需要 AUTH_TOKEN 的受支持 Node 部署无法完成普通用户首次进入；开发者工具绕过后导出仍不可用。默认无 Token loopback 和线上静态不受影响。

**修复**：实现明确凭据输入/重新认证，或受控 Cookie 会话；导出经带鉴权 fetch 读取 Blob 下载。不要恢复 URL query Token。

**严重程度**：P2，中。特定部署模式整个接入链不完整。  
**可信度**：真实 Chromium 与临时 Node API 已实际验证，使用假 Token。

### A-17 — 发布“失败”后线上已经切换，脚本没有版本回滚

**位置**：deploy/deploy-static.sh:96–103 静态软链接切换、:117–131 nginx 检查恢复、:134–156 清理与上线探针。

**证据**：先切换 WEB_ROOT，再验证 nginx/reload，最后验首页、runtime-config、Exa。失败只恢复 nginx 配置，不保存/恢复旧静态目标；版本清理在最后验收之前。文件头“失败仍是上一个版本”与控制流不符。

**影响**：脚本报失败时新前端可能已公开服务、与旧配置不匹配；操作者误以为旧版仍在线。nginx 配置部分回滚不等于整体发布回滚。

**修复**：保存旧静态目标与旧配置；先做可前置检查，切换后必要探针失败自动恢复两者并再验。版本淘汰在成功验收之后执行。正式修复须遵守部署授权，不能为验证直接运行生产发布。

**严重程度**：P2，中。发布失败扩大故障和误导恢复判断。  
**可信度**：有直接代码证据但未执行部署；未操作生产机器。

### A-18 — CSV 只转义分隔符，没有中和电子表格公式

**位置**：public/local-api.js:2737 csvCell、:2742 localProjectExport；src/server.js:1110 csvEscape、:2511 CSV 输出。

**证据**：项目 description 为无害测试公式 =1+1，通过真实浏览器 local export API 生成 CSV，description/descriptionZh 单元格仍以 =1+1 开头。两个函数只处理逗号、引号和换行，不处理公式起始字符。仓库 description/homepage 及笔记属于可进入 CSV 的外部或用户输入。

**影响**：用支持公式的 Excel/WPS 等打开时，不可信文本可能被解释为公式，造成内容篡改或诱导外部链接/请求，具体能力取决于客户端策略。不能宣称已复现 Excel 执行、凭据窃取或 RCE。见 [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection)。

**修复**：为电子表格导出采用经过验证的文本单元格中和策略，处理 =、+、-、@、控制字符/前导空白等；或提供显式文本类型的 XLSX。保留原始数据的 JSON 导出，不以 CSV 引号等同公式中和。

**严重程度**：P2，中。存在不可信外部内容进入可执行单元格边界，但利用依赖打开文件。  
**可信度**：CSV 输出已实际验证；实际电子表格公式行为未运行。

### A-19 — 支持的最低 Node 版本无法按文档命令启动 SQLite

**位置**：package.json engines >=22.8.0 与 start/dev scripts；src/lib/sqlite-store.js:3 require(node:sqlite)；README.md/README_EN.md 的 Node 版本与快速开始。

**证据**：[Node 22.8.0 SQLite 官方文档](https://nodejs.org/download/release/v22.8.0/docs/api/sqlite.html) 要求 --experimental-sqlite；项目启动/测试命令没有该 flag。22.13 起不再由该 flag 门控，见 [22.13 文档](https://nodejs.org/download/release/v22.13.0/docs/api/sqlite.html)。CI 的 node-version:22 下载当前 22.x，掩盖最低版本问题。

**影响**：符合声明版本的新用户按快速开始仍不能载入 SQLite。审查机 v25.8.2 测试成功不构成 22.8 验证。

**修复**：将最低版本提升到实际可无 flag 运行的版本并同步文档/lock engines，或一致加入所需 flag；CI 加最低支持版本任务。先核验其余使用 API 在所选最低版本均可用。

**严重程度**：P2，中。正式可运行契约不正确。  
**可信度**：官方版本契约和代码证据充分；本机没有 22.8，未安装/实跑旧版。

### A-20 — API base 以 /v1 结尾时，浏览器请求错误路径

**位置**：public/local-api.js:2044–2060 chatCompletionsUrl、:1376–1386 validateBrowserProviderStatus、:601 normalizeProvider、:874 safeSettings。

**证据**：base=https://gateway.example/v1 的真实 callModelJson 请求捕获为 /v1/v1/chat/completions；验证却用 /v1/models。已保存/导入的 Base URL 不剥离版本路径。默认 api.deepseek.com 根地址正常。线上 CSP 对其他 Provider 主机另有限制，不能将该 mock 等同真实自定义网关在线通过。

**影响**：受 API/导入接受的配置验证可通过，分析/方案生成路径却失败；同配置跨运行环境不兼容。

**修复**：统一 host root、API base 和完整 endpoint 的解析规则；验证和调用使用同一 base 对象；不支持的配置保存时明确拒绝，不要先显示可用。

**严重程度**：P2，中。常见兼容 base 配置造成特定 AI 路径不可用。  
**可信度**：URL 构建与模拟请求已实际验证；未连接真实网关。

### A-21 — 对外许可声明相互矛盾

**位置**：public/index.html:577；public/app.js:16/:728 siteFooterCopyright；scripts/static-pages-check.js:141/:148 的 MIT 断言；对照 LICENSE:1、README.md:389、README_EN.md Source License 段。

**证据**：实际 LICENSE 是 Source-Available Non-Commercial，自述不授商业使用；线上真实页面和中英文页脚却写“MIT 开源 / MIT open source”，静态测试还要求保留该错误声明。

**影响**：用户在使用/复用前看到互相冲突的授权信息，损害对外契约的清晰度。这里判定的是文本不一致，没有对许可证法律效力作裁定。

**修复**：保持用户已经选定的许可，统一页面、README、徽章和测试为准确名称/许可链接；不能未经授权把 LICENSE 换成 MIT 迎合页面。双语更新同时验收。

**严重程度**：P2，中。公开产品的重要使用边界被错误展示。  
**可信度**：源码、测试断言、线上页面均已实际验证。

## 6. 低优先级发现

### A-22 — Watch 数取的是 Star 数

**位置**：src/lib/github.js:1245 normalizeRepo；public/local-api.js:1507 githubRepoToProject；src/lib/scoring.js:1192 community Watch 项。

**证据**：输入 stargazers_count=50、watchers_count=50、subscribers_count=0，保存 watchers=50；同项目 community 从 52 变 68，多出 16。GitHub 明确 watchers/watchers_count/stargazers_count 都是 Star，真正 Watch 是 subscribers_count。见 [官方 Watching API](https://docs.github.com/en/rest/activity/watching)。

**影响**：Watch 字段不是独立订阅者信号，通常超过 16 Stars 的入池项目该项恒定满分、重复统计 Star。最终机会分权重较小/饱和，不能据此认定所有榜单改变。

**修复**：有 subscribers_count 时用真实值；搜索响应缺它时保存 unknown，不能用 Stars 代替。可取消该加分避免额外请求，再明确指标缺值。

**严重程度**：P3，低。局部指标契约错误，整体影响需重算评估。  
**可信度**：转换和计分函数已实际验证，并有官方契约支持。

### A-23 — 静态版显示每日自动扫描，实际没有定时执行能力

**位置**：public/local-api.js:3151 /api/config 固定 scanHour=8；public/app.js:7158–7163 renderConfig 自动扫描提示；对照 src/lib/scheduler.js:30 startScheduler 仅 Node 调用。

**证据**：线上配置按钮的 aria-label/tooltip 真实显示“自动扫描：08:00”；静态模式无 Node 服务，local-api 没有每日定时扫描执行者。现有 browser setInterval 是任务状态通知刷新，不会执行每日扫描。

**影响**：用户可能等待系统自行更新而得到陈旧项目池；浏览器关闭时尤其不可能履行该承诺。

**修复**：config 返回实际 capability/schedulerEnabled；静态版明确手动扫描，Node 显示真实日程与时区。是否增加常驻 worker/后端是另外的产品决策。

**严重程度**：P3，低。功能承诺与运行环境不一致，不是定时器已经发生故障。  
**可信度**：线上文案已实际验证，无执行路径有完整源码证据；未等待次日 08:00。

## 7. 设计建议（与真实缺陷分开）

### A-24 — 优先采用共享业务内核与明确的运行适配层

**位置**：public/app.js（约 13K 行）、public/local-api.js、src/server.js、src/lib/storage.js（约 6K 行）、public/domain-core.js。

**判断与证据**：两端网络/存储需要不同适配是合理的，当前实际评分、AI 验收、任务身份和方案上下文也重复。A-09 等实证说明重复已经影响业务契约；但大文件行数或原生 JS 本身不是缺陷，不因此强迫引入 React、ORM 或微服务。

**如果从头做**：将纯领域函数（评分、证据有效性、方案作用域、AI 结果验收、导出字段）共享；Node/Browser 只实现网络、事务和执行器。UI 按视图/交互职责拆模块，先减少隐藏全局 activeId 依赖。复用真实业务契约测试。

**取舍/严重程度**：设计建议；不是立即整体重写要求。迁移应逐步，先修数据丢失和指标契约。  
**可信度**：基于已审源码结构与本报告真实缺陷的设计建议。

### A-25 — 将用户资产备份与任务恢复作为可检验的产品能力

**位置**：public/local-api.js:2631 portableData、:2759 importPortableData；public/app.js:11412 exportPortableData；src/lib/storage.js 的 export/import；docs/DESKTOP_STORAGE.md。

**判断与证据**：目前“配置与学习”导出和“项目池”导出分开，不是完整工作区恢复格式；IndexedDB 可能未获 persistent storage，页面已经说明清站点会丢数据。现有披露合理，不能凭此宣称未告知风险；但是普通用户的长期观察资产缺少一次完整恢复演练证明。

**如果从头做**：定义版本化完整工作区备份（含项目、归档、作用域、用户记录），凭据默认排除；提供全新 profile 导入恢复验收。任务恢复用独立带 lease 的持久任务记录、原子 claim 和按结果提交，不把“status=running”等同“可重跑”。明确 exactly-once 不可轻易承诺，外部操作要有幂等边界。

**取舍/严重程度**：设计建议。单机/浏览器优先仍可保留，不要求把私有数据上传云端。  
**可信度**：源码/已披露边界支持；未做所有版本备份恢复和断电实验。

### A-26 — 将证据、未知和失败作为一等状态，凭据权限与模型成本明确收口

**位置**：src/lib/scoring.js、src/lib/llm.js、各 Provider、public/local-api.js:2075、deploy/nginx 配置、SECURITY.md。

**判断与证据**：A-08/A-10/A-11 表明未知、失败和成功在输出中混用。同源公开站点还持有访客 Key；CSP 允许 unsafe-inline，设备扩展/同源脚本被攻破能读取 Key。没有发现可实际触发的同源 XSS，不能把这些已披露攻击模型当成已存在漏洞。

**如果从头做**：证据记录 source/observedAt/interval/status/confidence，不让失败 signal 进入评分；AI 先验收再保存，限制输入与输出预算，仓库文字视为不可信资料。对长期高权限 Token 优先桌面 Keychain 或受控短权限凭据；Web 版明确本 origin 的信任边界，减少内联脚本并收紧 CSP。选 Token 最小权限和允许的操作，不以“本地优先”代替权限治理。

**取舍/严重程度**：设计建议。Web BYOK 能降低服务端集中持密钥风险；Keychain 需要桌面打包投入，是否采用取决于目标用户。未要求添加多用户后端或更换供应商。  
**可信度**：源码与安全说明支持的设计建议；未复现 prompt injection、XSS、扩展攻击或真实异常账单。

## 8. 验证记录与局限

### 实际执行结果

| 检查 | 结果 | 说明 |
|---|---|---|
| npm run ci（首次） | FAIL | 256 测试，255 通过；local-api.test.js:613 期望 modelCalls=1，实际=2；后续环节因命令链短路未执行 |
| npm run ci（重跑） | PASS | 256/256；语法、覆盖率门槛、secret audit、10 项 offline plan matrix、git diff --check 通过 |
| local-api 单文件复查 | PASS | 34/34；稀疏方案用例单独与整文件均通过，未归因成确定业务缺陷 |
| npm audit --json | PASS | 当时注册库返回 0 已知漏洞；仅 4 个开发/可选依赖，不能据此证明业务安全 |
| npm ls --depth=0 | PASS | 已安装 fake-indexeddb 6.2.5、playwright 1.61.1，与锁文件一致 |
| npm run visual:check | PASS | 隔离源码副本、临时库；5 视口 × 2 语言 × 6 视图，60 张矩阵截图，0 自动布局/console 问题；人工抽查移动设置和英文项目池 |
| npm run check:static（首次） | FAIL | 桌面 back-to-top 保留 scrollTop=900；首次引导可能干扰，尚未定位根因 |
| npm run check:static（重跑） | PASS | 子路径、无后端无 Key、示例种子/刷新、双语、桌面/移动、资源、页脚与返回顶部通过 |
| 线上返回顶部独立检查 | PASS | 关闭初次引导后，真实 Chromium 键盘 Enter 返回 scrollTop=0、按钮 hidden=true；不能据首次脚本失败报“返回顶部坏了” |
| npm run perf:storage:fixture | PASS | 6263 项目、11 方案、120 scans、60 档案；冷读68.6ms、首次列表1361.4ms、summary988.1ms、增量写76.5ms、heap约133.4MiB；是本机/合成库测量 |
| 定向隔离复现 | 复现缺陷 | 真实 SQLite、Chromium、socket 与 VM/mock 分别见各发现，不冒称供应商实测 |
| 业务代码 diff | 无 | 最终只新增报告和被 gitignore 排除的审查材料；未 commit/push/deploy |

第一次失败的门禁具有独立工程信息价值：后续应保留 trace，排查任务并发/测试隔离和引导时序，而不是删掉断言或用重跑覆盖失败历史。现阶段没有证明唯一根因，故没有单列“业务缺陷”编号。

性能通过已有预算，但约1秒以上同步列表/summary 处理在 Node 主线程执行，会影响其他请求的响应时间。这是容量规划限制，未跑真实用户规模、低配主机或生产并发，不能声称生产超标。后续若扩大项目量应测 p95/p99、长任务下 UI 响应，考虑 SQL 分页/派生索引、避免重复整池计算，不为个人小应用强行分布式化。

### L2 公开展示质量复核

按实际公开 Demo/UI 定为 L2，未擅自升级成增长型 L3。以下“PASS”仅限注明范围，不等于发布总验收通过：

| 项目 | 状态与边界 |
|---|---|
| 定位、反馈入口、README 目录与截图 | 文件存在/本地审阅 PASS；未验证真实联系方式收件、二维码交易/添加成功 |
| 中英 README | 两份存在；许可证说明总体一致；英文“nothing uploaded to StarVault server”未像中文明确说明 Exa 代理例外，建议同步事实，未另立根因 |
| 可运行契约 | BLOCKED：A-19 最低版本声明；默认本机当前 Node 可运行 |
| 安全/隐私 | 已披露本机明文及单用户边界；A-06 需确认生产 TLS 校验；无明显 tracked/history 凭据被 secret scanner 发现，非完整秘密不存在证明 |
| 3 分钟首次成功 | 示例方案/25项目/榜单无 Key 可见，PASS；未做真实新用户访谈或供应商配置成功测量 |
| 桌面/移动导航、布局、返回顶部 | 当前 Chromium 与矩阵 PASS；Safari/Firefox、屏幕阅读器、全部键盘流程未全面验证 |
| 稳定展示站 | 主域本次只读可访问 PASS；镜像当前版本未核验 |
| 社交预览、Logo/Favicon、Star/History | 本地资源/README 组件存在；没有穷尽外部动态组件实时行为 |
| LICENSE、治理/贡献、CI/变更文档 | 文件存在；许可页脚冲突为 A-21；目前门禁有未稳定解释的首次失败 |
| 故障、恢复、数据一致性 | BLOCKED：A-01—A-05；付费/真实 GitHub 写、全量断网与跨版本迁移尚未全验证 |
| 发布恢复 | BLOCKED：A-17；未执行生产回滚演练 |

### 未能验证、不能声称通过的内容

- 生产机器 nginx -T、继承 CA 校验、实际文件权限、访问日志脱敏、备份/监控、TLS 运维与 WAF。
- 用真实 Token 扫描/读取个人仓库、Star/Unstar/Fork；真实 Tavily/Exa/AI 成功、CORS、额度、成本和输出质量。
- Safari/Firefox、iOS 浏览器配额/驱逐、真实多 tab lease、断电/系统崩溃恢复、旧数据全版本迁移。
- 用户真实 data/ 的内容完整性、运行中的本地服务状态；没有为了审查载入/改写真实用户 DB。
- README 所列联系人、二维码与付款入口真实可用性；没有发送邮件、付款或联系他人。
- 确定可利用的 XSS、prompt injection、SSRF 绕过、供应链攻击或公开 API 大流量抗压。本次源码/定向检查未确认，不表示不存在。
- 真实推荐有效性、学习偏好长期收益及反信息茧房效果。分数合理性最终需要效果评估，不能由公式和测试计数证明。

## 9. 下一阶段修复顺序与验收边界

1. **先保用户资产**：A-01/A-02/A-03 定义唯一权威、按记录事务、冲突/revision 与 writer 契约；A-04/A-05 保护方案成员和失败分区。先在隔离库写行为复验，再考虑真实数据迁移，禁止无备份直接清理旧库。
2. **保证任务不会错跑、重跑和混写**：A-07/A-13/A-14/A-15；复验双 tab、切方案、恢复、冷却、部分成功。改变 lease/恢复机制时确认兼容已有持久任务。
3. **保证结果诚实**：A-08/A-09/A-10/A-11/A-22；明确评分版本、时间窗口、证据/失败状态，避免迁移后无说明改分数。
4. **收口网络与接入**：先确认 A-06 有效配置；修 A-12/A-16/A-18/A-19/A-20。不要为测试使用用户真实 Token 或产生付费调用。
5. **修部署与公开契约**：A-17/A-21/A-23；隔离发布故障演练，统一许可与能力文案，再按授权发布。测试根因与恢复证明完成后再扩大使用。

这些是下一阶段建议，不是本阶段授权修改或发布。修复完成的最低证据应是：旧记录不丢、跨方案归属正确、恢复不重复外部调用、失败不伪装成业务成功、相同版本指标可比较、故障发布可恢复。单纯重跑现有门禁通过不足以关闭本报告。

## 10. 两个最终问题

**项目最大的隐患是什么？**

最大的隐患是：**持久化用了 SQLite/IndexedDB 事务，但业务层仍把缓存快照当成可覆盖的真相，再自动在多个数据源、tab 和任务上下文间切换。** 所以“保存成功”“任务完成”不能保证用户资产仍存在、属于正确方案。A-01—A-05 是明确可复现的后果。对这类长期观察工具，丢掉笔记/偏好比榜单排得不好更伤根本信任。第二层隐患是失败/未知被包装成可信评分与研判，A-08—A-11。

**如果从头做，会在哪些关键决策上采用不同方案？**

- 先定数据权威和并发模型：Node 单 writer 或明确事务/CAS；浏览器按记录事务，离线写通过 outbox，不默默换库。
- 同一个纯业务内核服务 Node 和浏览器，评分/风险/时间窗口/方案作用域有版本和共同定义；运行适配器只处理平台差异。
- 长任务独立建模 owner/lease、checkpoint 与结果提交；请求身份包含方案和需求，恢复与外部副作用边界可检验。
- 将成功、空结果、未知、部分失败、过期证据分开；模型输出先业务验收再保存，禁止兜底生成正向结论。
- 先做完整备份恢复与发布回滚演练，再增加复杂学习/榜单功能；个人本地优先和少依赖的目标可以保留，无需为此改成 SaaS 或重型框架。

## 附录：审查材料与复现方式

审查辅助材料存于 output/audit-20261008/（被仓库 gitignore 排除，供本机下一阶段使用；不应自动上传/公开）。AUDIT_REPORT.md 本身包含独立定位、触发和验收，不依赖临时目录存活。

从本项目根执行，使用既有依赖即可：

    node output/audit-20261008/storage.cjs
    node output/audit-20261008/wal.cjs
    node output/audit-20261008/scan.cjs
    node output/audit-20261008/discovery.cjs "/Users/wilson/Documents/Codex/StarVault Imprint"
    node output/audit-20261008/csv.cjs
    node output/audit-20261008/network.cjs
    node output/audit-20261008/auth.cjs

前四组覆盖 A-01/A-03/A-04/A-05/A-07/A-08/A-09/A-10/A-11/A-13/A-14/A-20/A-22。network.cjs 覆盖 A-12/A-15，auth.cjs 覆盖 A-16；两者也已由主审重跑确认。csv 输出只验证公式字符串未被中和，不执行公式。fake-indexeddb 使用隔离 factory；wal 使用新临时 DB；供应商均 mock，不读取真实 Key。

offline.cjs 对应 A-02：记录的原执行使用 /tmp/starvault-audit-isolated 源码副本启动无 .env 服务和系统 Chrome；复用时须先建立等价隔离副本并确认端口4188空闲，不可把路径改为用户真实数据。offline.log 保留真实 Chromium 实证。

ci-first.log/ci-repeat.log、static-first.log/static-repeat.log、visual.log、perf.log、dependencies.json、plans.log、storage.log、scan.log、discovery.log、csv.log、offline.log、network.log、auth.log 保存本次检查证据。临时服务测试仅保存假数据，不含用户凭据。动态时间/fixture 路径可能因复跑变化。

报告基于上述提交和当日线上观察。代码/部署变化后须复核受影响结论，不把本报告当成永久安全保证。

