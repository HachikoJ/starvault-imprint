# StarVault Imprint 修复计划

制定日期：2026-10-08（Asia/Shanghai）

项目根目录：`/Users/wilson/Documents/Codex/StarVault Imprint`

依据：[AUDIT_REPORT.md](</Users/wilson/Documents/Codex/StarVault Imprint/AUDIT_REPORT.md>)

代码基线：`d20b69d8bf44cbbb5b38ec86472f18ed6f660192`

公开入口：https://starvault.deline.top/

性质：计划于 2026-10-08 制定，随后用户授权按阶段执行与独立任务提交；原修复轮记录见第10～12节。2026-10-11用户进一步授权主站上线，并提供SSH密钥、要求继续完成未完成任务；部署和A-06/T-23的结果见第13节。随后用户明确要求更新GitHub；同步及远端验收以第14节为准。安装、付费调用、旧版本删除及真实Node数据库迁移均未实施。

## 1. 执行目标与边界

先保证已保存的用户资产不会被后台任务、断连恢复或其他 writer 覆盖，再修正任务归属、结果真实性、接入和发布恢复。完成依据是每个任务的行为验收和阶段回归，不是“现有测试绿色”。

本计划处理原报告全部 **26 条发现**：原修复轮22项T-01～T-22全部验收完成；本轮上线核验确认A-06并追加独立T-23，亦已验收。当前**23条发现纳入修复、23项任务已完成，A-24～A-26继续暂缓**。D-01～D-05已按各自证据与契约结项。主站已实际部署，未运行Node生产数据库迁移。当前交接以第13/14节为准；第11/12节保留为当时的历史节点。

只实施任务中明确的范围。不得顺带重写 UI、引入框架/ORM/多租户、改变许可证、增加云同步或扩大 Provider 白名单。一个补丁可同时实现多个任务，但必须分别记录 A→T、测试结果和验收；不能以一个任务完成自动关闭另一任务。

执行前核对 HEAD 和工作区差异。本次计划制定前仅有未跟踪的 `AUDIT_REPORT.md`；已有报告、审查材料及用户修改必须保留。若基线变化，只核验受影响任务，不重启全面审查。涉及真实库迁移、取消既有离线写能力、限制 writer、改变评分/最低支持版本等重大行为时，先提交具体差异、影响和恢复方案，由用户确认后执行对应变更。独立的低风险修复不受这些决策阻塞。

## 2. 项目实际环境与核验依据

### 2.1 两种运行模式必须分别验收

| 模式 | 实际执行与存储 | 本轮修复必须维护的边界 |
|---|---|---|
| 公网/Pages 静态 | `public/app.js`、`local-api.js`；IndexedDB v5；浏览器直连 GitHub/Tavily/AI；Exa 经 nginx | 无 Node 调度器；主域与 Pages 子路径；不把静态无 `/api/config` 当成 Node 断线；无真实 Key 也能看示例 |
| 本地 Node | `src/server.js` 原生 HTTP；SQLite WAL、缓存；持久任务并发上限 2 | 默认 loopback；受 AUTH_TOKEN 保护的模式；CLI `scripts/run-scan.js` 目前直接使用同一 STORE_PATH |

制定计划时本机 Node 为 v25.8.2、package.json 声明 `>=22.8.0`，当时未能证明最低版运行能力。执行后契约已改为 `>=22.13.0`，官方隔离最低版实际验收见 E23；系统 Node 未替换。已有 fake-indexeddb 6.2.5、playwright 1.61.1。无前端编译步骤，不能编造 `npm run build`、`lint` 或专用 e2e 命令。

### 2.2 本轮做了哪些针对性核验

本轮没有重新全面审查，也没有重新访问生产或调用真实供应商。读取报告、相关函数、实际测试文件、package scripts、CI 和部署控制流，确认代码仍在原基线。

| 记录 | 日期/环境 | 结果及解释 |
|---|---|---|
| V-01 基线与任务入口 | 2026-10-08；Git/源码 | HEAD 与报告一致；确认下列命令和已有测试文件存在；报告 refreshIndexedDbSnapshot 行号校正为 app.js:5271，putSnapshot 为 :5290 |
| V-02 SQLite 定向复现 | 2026-10-08 14:27；新临时 SQLite；`node output/audit-20261008/wal.cjs` | 主库 mtime 不变，B 读 A 写入为 null，B 再写后新读仅有 b；未访问真实用户库。补充源码事实：sqlite-store.openState 按路径复用同一连接，data_version 单独不足以发现同连接提交 |
| V-03 结果/请求契约复现 | 2026-10-08 14:27；VM/mock/fake-indexeddb；`node output/audit-20261008/discovery.cjs '/Users/wilson/Documents/Codex/StarVault Imprint'` | A-08/A-09/A-10/A-11/A-20/A-22 的报告现象仍在；AI 请求仍无 AbortSignal。未实测模型、网关、电子表格或线上评分效果 |
| V-04 源码针对性核对 | 2026-10-08 | A-02 回退/快照覆盖、A-15 先 limit 后 filter、A-16 未调用 setAuthToken、A-17 先切换后探针无静态回滚、A-19 engines/CI、A-23 静态 scanHour 均仍存在；不是本轮端到端复现 |

其他“已实际验证”均引用原报告的隔离证据，不声称本轮重新实测。原报告 CI 第一次 255/256、重跑 256/256；静态检查第一次失败、重跑通过。现有通过记录不能关闭下面任何任务。原脚本通常打印现象而不 assert，退出码 0 只说明脚本运行完；必须转换成正式断言。

审查材料在 `output/audit-20261008/`，被 gitignore 排除，可辅助重现，不能成为唯一验收依据。若材料不在新机器，按各任务步骤新增行为用例，不需要上一轮对话。材料有些通过 VM 提取内部函数，后续必须同时验证正常 API/存储入口，防止测试只覆盖提取后的替身。

## 3. 全部发现的去向与 A → T 对应

| A 编号 | 原严重度 | 去向 | 任务/状态 | 决策依据与范围 |
|---|---|---|---|---|
| A-01 | P1 | 纳入修复 | T-01／已完成 | 后台与多 tab 旧快照失写已有隔离实证；修事务提交与缓存一致性 |
| A-02 | P1 | 纳入修复 | T-02／已完成 | 丢离线编辑已实证；D-01 决定只读缓存还是可写离线副本 |
| A-03 | P1 | 纳入修复 | T-03／已完成 | WAL 失写本轮再次实证；D-02 决定 writer 契约，不能仅换 mtime 检查 |
| A-04 | P1 | 纳入修复 | T-04／已完成 | 部分失败移除旧成员；先用保守增量，不顺带改变全成功采样池契约 |
| A-05 | P1 | 纳入修复 | T-05／已完成 | 共享仓库丢其他方案关系；独立验证，不能被 T-01 吞并 |
| A-06 | P1（生产配置证据已确认） | 纳入修复 | T-23／已完成 | 2026-10-11有效nginx配置没有继承verify；隔离证书拒绝测试和实际部署验证通过，见第13节 |
| A-07 | P2 | 纳入修复 | T-06／已完成 | 多 tab 重复调用已有 mock 实证；认领/恢复独立于结果提交 |
| A-08 | P2 | 纳入修复 | T-07／已完成 | 无效 AI 内容成功保存；两端验收并保护旧研判/学习 |
| A-09 | P2 | 纳入修复 | T-08／已完成 | 同名指标不可比较已实证；D-03 决定共同定义或显式区分，未认定 Node 权重更优 |
| A-10 | P2 | 纳入修复 | T-09／已完成 | 任意间隔称昨日增长；修时间窗口与标注，不默认增加每日统计服务 |
| A-11 | P2 | 纳入修复 | T-10／已完成 | Provider outcome/旧checkpoint/CLI/评分/持久化/prompt及Chrome诊断验收通过，见E16 |
| A-12 | P2 | 纳入修复 | T-11／已完成 | 完整正文 deadline 与预取消问题已实证；浏览器调用边界有源码/捕获证据 |
| A-13 | P2 | 纳入修复 | T-12／已完成 | 去重身份缺方案/需求；两端输入身份与归属校验 |
| A-14 | P2 | 纳入修复 | T-13／已完成 | A 扫描归档 B 已实证；显式传任务 owning plan |
| A-15 | P2 | 纳入修复 | T-14／已完成 | 原队列函数足以证明条件缺陷；补真实队列组合验收，未声称完整 UI 已复现 |
| A-16 | P2 | 纳入修复 | T-15／已完成 | AUTH_TOKEN 首次进入与导出已实证；沿用现有 Bearer，避免新增账户体系 |
| A-17 | P2 | 纳入修复 | T-16／已完成 | 控制流确认失败后不能恢复旧前端；只做隔离故障演练，不直接部署生产 |
| A-18 | P2 | 纳入修复 | T-17／已完成 | CSV 实际输出公式起始串；不夸大成已执行公式/RCE |
| A-19 | P2 | 纳入修复 | T-18／已完成 | 官方最低版本契约与启动参数冲突；D-04 决定最低版本/flag，需实跑所选版本 |
| A-20 | P2 | 纳入修复 | T-19／已完成 | /v1/v1 捕获仍可复现；API/导入路径接受此配置，不扩大线上 CSP 域名支持 |
| A-21 | P2 | 纳入修复 | T-20／已完成 | 许可声明冲突已有页面与文件证据；保留既有非商业 LICENSE |
| A-22 | P3 | 纳入修复 | T-21／已完成 | Watch 实取 Star；缺值明确 unknown，不额外要求全池逐仓库请求 |
| A-23 | P3 | 纳入修复 | T-22／已完成 | 静态无执行者却承诺自动扫描；修 capability 与文案 |
| A-24 | 设计建议 | 暂缓 | 无 T／已搁置 | 整体共享内核/UI 模块拆分是架构投入，超出缺陷修复。T-08 可共享必要纯函数，但不代表关闭 A-24；保留未来独立架构提案 |
| A-25 | 设计建议 | 暂缓 | 无 T／已搁置 | 完整工作区备份格式是新增产品能力，当前导出边界已披露；本轮仅为高风险修复准备隔离备份。T-06 的 lease 不等于实现完整恢复产品 |
| A-26 | 设计建议 | 暂缓 | 无 T／已搁置 | Keychain、凭据模型、全面 CSP/证据架构重做无已复现攻击，需单独产品/安全方案。T-07/T-09/T-10/T-11 只修各自具体缺陷，不能自动关闭此建议 |

“已搁置”的依据是本次用户明确排除设计偏好自动进入必修队列和限定修复范围，并非认定建议无价值。没有发现被排除；若后续确认误报，必须保留 A 行、证据和排除理由，不删除追踪。

## 4. 待确认事项与阻塞关系

决策未记录之前，不实施依赖它的行为变化。可以先编写失败用例、制作隔离方案和评估兼容性；这些准备不算任务完成。决策记录需填选择、依据、影响、确认人/日期和恢复点。

### D-01：Node 断线时 IndexedDB 的权威与写权限

- **建议**：Node 模式保持服务端为权威；断线允许读缓存，写操作明确失败；静态模式继续独立可写。这样修复不需要 outbox 或自动重放外部操作。
- **备选**：保留 Node 离线写，则实现 operationId、dirty/outbox、冲突展示与确认同步；不能只给现有覆盖逻辑加提示。
- **必须处理的存量**：旧版本没有 dirty 标记，不能可靠识别所有历史离线编辑。恢复同步前保留独立本地快照/差异，存在歧义时让用户选择，不能直接断言“本地均可覆盖”。不能迁移时至少阻止自动覆盖并提供恢复路径。
- **阻塞**：T-02 的实现与验收；不阻塞 T-01。选择 outbox 时，依赖 T-01 的事务/revision，还需 T-12 的请求身份；不得自动把 Star/Unstar/Fork/AI 调用当可重放普通写。
- **状态/记录**：已完成（仅决策）；2026-10-08 用户明确选择“只读离线缓存：断线写明确失败，恢复前保护存量差异”。静态写保持；真实库迁移仍未授权。

### D-02：SQLite 保留多 writer，还是强制一个 writer

- **建议**：保留当前 server/CLI 使用方式，采用 DB 内持久 revision 和短读改写事务/冲突检测，更新按字段/记录合并；不得在网络调用期间持事务。明确同连接与跨进程两种更新检测。
- **备选**：强制单 writer，CLI 改为提交服务任务并提供服务未启动时的明确行为。这是兼容性变化，需确认 standalone `npm run scan` 如何继续工作；仅 README 写“别并发”不足以修复。
- **技术约束**：mtime（含 WAL mtime）不是版本；data_version 只反映其他连接提交。同一 openState 连接复用时必须另有 revision/失效通知。单 writer 也必须防业务旧快照异步覆写。
- **阻塞**：T-03；其后的 Node 写入/恢复验收必须在选定 writer 契约下复验。T-04/T-12/T-14 可先写隔离用例，不能以 SQLite 提交原子性代替无失写证明。
- **状态/记录**：已完成（仅决策）；2026-10-08 用户明确选择“保留 server/CLI 多 writer：短事务、revision 与冲突处理”。现有入口保留，先临时库验证；真实数据迁移另行确认。

### D-03：评分和风险的公共定义

- **建议**：用共享纯函数定义一个评分版本；先写业务案例和字段语义，Node 现有逻辑仅作为候选，不能默认正确。记录 scoringVersion、风险字段定义和数据来源；历史分数保留旧版，不无提示重算历史档案。
- **备选**：两端有意不同，则显式版本/名称/定义，UI、排序、导出禁止把不同定义混作同一比较序列，迁移说明差异。不能仅加字段但继续混排。
- **需要决定**：项目技术风险与许可风险的关系、版本比较方式、旧记录未知版本的展示与是否由用户发起重算。无需在本轮评估真实推荐收益或全面换评分权重。
- **阻塞**：T-08；不阻塞 T-10/T-21 的事实错误修复。T-08 必须在 T-10/T-21 完成后集成，避免把错误输入写入新基线。
- **状态/记录**：已完成（仅决策）；2026-10-10用户明确选择共享现有Node规则候选，保持Node权重，项目/许可/行动风险分开，允许browser排序改变；旧分数/档案保留、新扫描或明确重算才产新版、不同版本分组避免混排、独立代码可回滚，无真实数据迁移。评分真实收益仍未经验证。

### D-04：最低 Node 支持版本

- **建议**：将最低版本提高到经实跑可无 flag 使用 SQLite 的版本，候选 22.13.0；同步 package、lock、双语文档和最低版本 CI。必须先验证其他实际 API，22.13 不是“自动全兼容”的保证。
- **备选**：保留 22.8，所有 Node 启动/测试/脚本入口一致加 flag，并实测 22.8。不能只改 `start` 留下 CLI/测试仍失败。
- **阻塞**：T-18 的契约落地和最低版本最终门禁；不阻塞当前 v25.8.2 上隔离修复。需要所选版本运行环境时，缺少环境应记已阻塞，不自动安装或把当前版本通过冒称最低版本通过。
- **状态/记录**：已完成（仅决策）；2026-10-08 用户明确选择提高到 >=22.13.0，同步 package/lock、双语 README 与最低版本 CI；授权下载官方 22.13.0 到隔离临时目录作验收，不替换系统 Node。官方隔离22.13.0版本、SQLite烟测及T03相关25项已通过（E03/E06）；所有入口的最低版验收仍留T18。

### D-05：A-06 是否在生产实际关闭上游 TLS 校验

- **证据缺口**：仓库 location 只有 SNI，没有显式 verify/CA；未取得 nginx -T，可能继承 http/server 配置。
- **具体核验**：有对应主机只读访问授权后，由运维执行 `sudo nginx -T`，追踪目标 location 的有效 `proxy_ssl_verify`、`proxy_ssl_trusted_certificate`、`proxy_ssl_name`、verify_depth 和 nginx 版本/CA 文件可读性；只保存必要脱敏片段。未授权访问时请用户提供该有效配置片段，不自动 SSH。
- **决策分支**：有效配置关闭或错误时，确认 A-06 并追加独立 T-23，保留条件性 P1 的证据升级记录；有效配置已开启且可信 CA/名称正确时，A-06 可改“排除线上缺陷”，写明继承依据，location 显式化另属非必需防御建议；拿不到证据继续待确认。
- **确认后验收上下文**：在隔离 nginx/假 Exa 上游用虚假 Key 测试可信正确名称成功、自签/错误名称被拒绝、CORS 与预检保持；命令 `nginx -t -c /绝对路径/隔离配置` 需完整临时 prefix/日志目录，不能误用默认生产配置。系统 nginx/测试证书工具当前未核验，有缺项就记录环境阻塞，不安装/不做生产 MITM。
- **阻塞**：不阻塞 T-16 的本地回滚修复；任何声称“Exa 生产凭据链安全验收通过”的发布结论被阻塞。待确认不是已经存在攻击，也不授权改生产配置。
- **状态/记录**：已完成；2026-10-11已取得有效nginx配置，确认无继承verify，A-06追加T-23；隔离证书矩阵、线上配置差异及Exa真实无效Key探针通过。原先的证据缺口已解除，见第13节。

### D-06：全成功但有分页/样本上限的发现池语义

- 原 A-04 同时提醒“有限发现样本”是否代表当前发现池，未认定该设计为确定缺陷。本轮 T-04 只修明确的部分检索失败，不扩大到永久保留全部历史项目。
- 若产品要求“仓库仍存在便不得移除”，需独立确认成员生命周期、撤销规则和历史展示，再追加范围；若是“本轮发现池”，维持全成功替换并明确该语义。
- **阻塞**：不阻塞 T-04 的保守错误处理；阻塞任何更广的成员生命周期重设。状态：待确认；未选择新产品契约。

## 5. 通用执行、隔离和验证规则

### 5.1 任务状态与记录格式

允许状态仅为：**待办、进行中、已完成、已阻塞、待确认、已搁置**。

- 待办：证据成立、目标清楚、尚未开始；开始实际实现后改进行中。
- 待确认：产品/架构/契约决策尚缺；填 D 编号与精确阻塞范围。
- 已阻塞：环境、权限或前置任务不足使执行无法推进，记录缺项与解除条件；不能把“没有跑”写成测试失败。
- 已完成：本条全部验收及所在阶段相关门禁通过，记录代码版本、环境、命令、断言结果和证据路径。代码写完或旧测试通过不够。
- 已搁置：有明确范围/价值/风险决策，记录原因、日期和重新考虑条件。不能用来掩盖验证失败。

每项更新采用：`日期｜执行版本｜状态｜修改文件｜命令/场景｜实际结果｜验收条款逐项结果｜证据路径｜剩余阻塞/回滚点`。日志须脱敏；记录首次失败、根因和重跑，不能删除断言或仅报告最后一次通过。变更涉及同一代码的多个 T，分别记录该 T 的断言。

### 5.2 隔离与回滚点

| 代号 | 适用 | 隔离、回滚点与可能影响 |
|---|---|---|
| R-IDB | T-01/T-02/T-04/T-05 | 独立 Chromium profile/origin、全新 IDBFactory，虚构双方案/共享项目/笔记 fixture。迁移前后保存完整 fixture 快照与数量/关联摘要；旧 schema fixture 保留。真实资料只在获得对应授权后备份；旧代码不一定能读新 schema，回滚需配套数据库副本，不能直接降级覆盖新数据 |
| R-DB | T-03 和 Node 写路径 | 每用例 mkdtemp + 独立 STORE_PATH；跨进程 child 也只打开该路径；回滚为代码补丁加迁移前库副本。真实 SQLite 备份用一致性备份，或停止全部 writer 后保存 DB/WAL/SHM；禁止运行中随手只复制 .db。记录恢复后笔记/任务/关联是否完整；不删原库 |
| R-TASK | T-06/T-11/T-12/T-13/T-14 | Provider mock、可控响应 gate、两 tab/进程、旧 running/checkpoint fixture；备份任务记录和 owner/revision。可能改变恢复、并发或取消时机；旧任务身份未知不得自动重跑高成本/外部写，不承诺崩溃全场景 exactly-once |
| R-SCORE | T-08/T-09/T-10/T-21 | 固定元数据/时间/成功与失败信号 fixture；保存旧分数/趋势/档案，版本化新结果。回滚评分代码不重写历史；不批量删除/重算真实项目。改变排序/风险必须可解释，未知不伪装为零 |
| R-DEPLOY | T-16、确认后的 A-06 | 独立本地发布目录、软链接、配置、假 HTTP 上游；所有 ssh/rsync/curl/sudo/systemctl 必须替换为可检查的 mock 或连接明确隔离环境。回滚点是原静态目标与原 nginx 配置的组合；回滚失败单独报告。不得触达脚本默认生产 HOST，不执行真实版本清理 |

备份不等于重大变更授权。准备可评审补丁/fixture 后再处理相应确认；普通测试不会借机读取用户真实 `data/`、`.env` 或浏览器 profile。

### 5.3 确实存在的命令

以下从项目根执行。任务章节的 `node --test tests/...` 文件在制定时存在，除非明确标注“需新增”。扩充现有 tests 为主；缺真实浏览器/队列/部署行为时另建明确列出的测试。不要把正则源码断言当成用户路径实测。

```sh
node --version
npm ls --depth=0
git rev-parse HEAD
git status --short
npm run check
npm run test:coverage
npm run audit:secrets
npm run audit:plans:offline
git diff --check
npm run ci
npm run visual:check
npm run check:static
npm run perf:storage:fixture
```

`npm run ci` 已组合语法、覆盖率、secrets、offline plans、diff 检查。视觉/静态/perf 是单独脚本；`release:check` 存在，但在未完成隔离前不要机械运行。**不得运行**真实 `npm run scan`、`audit:plans:live`、生产部署脚本、真实 Token 操作或 `perf:storage` 默认真实库来证明本计划。

现有视觉脚本会生成 fixture 并启动服务，但 config 会读 cwd 的 `.env`；静态/视觉脚本还写固定 output 目录。复验时在不含 `.env`/`data` 的隔离源码副本执行，避免继承真实环境和覆盖旧审查证据。下列准备命令使用现有 Node/依赖，不安装、不复制秘密；输出临时目录，保留它供复核：

```sh
# 从项目根执行，生成副本并打印路径。
node <<'NODE'
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = process.cwd();
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'starvault-fix-verify-'));
for (const name of ['src', 'public', 'scripts', 'tests', 'deploy']) {
  fs.cpSync(path.join(root, name), path.join(target, name), {recursive: true});
}
for (const name of ['package.json', 'package-lock.json']) {
  fs.copyFileSync(path.join(root, name), path.join(target, name));
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(target, 'node_modules'), 'dir');
console.log(target);
NODE
```

当前 src/lib/config.js 接受 GITHUB_TOKEN、TAVILY_API_KEY、EXA_API_KEY，以及 AUTH_TOKEN/ACCESS_TOKEN；没有 EXA_KEY/TAVILY_KEY 别名。进入输出目录后，可用以下真实命令清空凭据并运行隔离检查（先确认本地脚本端口可用）。无 .env、无 data 副本加脚本自建临时库共同保证不访问真实资料：

```sh
env GITHUB_TOKEN= TAVILY_API_KEY= EXA_API_KEY= AUTH_TOKEN= ACCESS_TOKEN= PUBLIC_ORIGIN= TRUST_PROXY=0 RUN_SCAN_ON_BOOT=0 VISUAL_HOST=127.0.0.1 npm run visual:check
env GITHUB_TOKEN= TAVILY_API_KEY= EXA_API_KEY= AUTH_TOKEN= ACCESS_TOKEN= RUN_SCAN_ON_BOOT=0 npm run check:static
env GITHUB_TOKEN= TAVILY_API_KEY= EXA_API_KEY= AUTH_TOKEN= ACCESS_TOKEN= RUN_SCAN_ON_BOOT=0 npm run perf:storage:fixture
```

后续若配置代码变化，复核新增环境 Key；测试子进程宜使用最小 env，只保留 PATH、系统临时目录/浏览器运行所需变量和测试明确设置的假 Key/库路径。Git 历史 secrets/diff 门禁在真实工作 checkout 执行，不在无 .git 的副本声称通过。

浏览器用既有 Playwright/可用 Chrome。缺浏览器记环境阻塞，不擅自安装。新增 browser 测试应在 node:test 中用 Playwright、隔离服务和网络拦截；根 `npm run test` 会自动收集 `tests/*.test.js`。本计划不要求新增第三种 runner。

### 5.4 每阶段通用门禁 G

1. 新行为测试在原基线必须能证明原缺陷（失败断言或明确旧输出），在修复版通过；适用的不变量在两端分别验证。
2. 阶段结束运行 `npm run ci`；数据阶段再跑隔离 `npm run perf:storage:fixture`；UI/静态变更跑隔离 `npm run visual:check` 与 `npm run check:static`。没有变更/失败原因时不重复无关大检查。
3. 复验此前已完成任务的相关用例。不得相对原基线引入新增失败、数据损失、认证绕过、静态路径不可用或 UI 关键路径退化。原基线偶发失败保留 trace 并定位；不能以重跑通过默认豁免新失败。
4. 有验收缺项、最低版本缺环境或决定未落地时，阶段为未通过/受阻，相关 T 不标完成。未阻塞的独立工作可继续；不把未解决 P1 带入“可放心发布”结论。

## 6. 独立修复任务

以下行号针对上面的提交，下一轮以函数名和实际调用路径定位，行号漂移不表示任务失效。工作量 S=局部修改加少量行为测试；M=跨函数/两端或新集成用例；L=存储/同步/恢复协议及兼容迁移。优先级 P1/P2/P3 表示执行紧迫度，风险低/中/高表示修改自身的影响和恢复成本，与原缺陷严重度分开。

### T-01 — 按记录提交浏览器变更，防止旧快照覆盖

- **来源/证据/定位**：A-01，P1；原审 fake-indexeddb 实证：挂起 analysis 时保存笔记，任务结束后 notes 清空；两 tab 不同设置也相互覆盖。[local-api.js:185](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:185>) saveSnapshot、requireSnapshot(:304)、analyzeProjectWithModel(:2140)、startLocalTask(:2535)；[indexeddb-storage.js:262](</Users/wilson/Documents/Codex/StarVault Imprint/public/indexeddb-storage.js:262>) persistSnapshotWithDb、getSnapshot(:503)。
- **目标/范围**：所有常规写路径按对应 plan/userData/settings/task 字段在短 readwrite 事务中读最新值再更新；网络结束只提交自身结果。整包导入/同步使用 revision/CAS 与明确冲突处理；跨 tab 通知只负责缓存失效。排查这些函数的调用者，不能留下 checkpoint/finally 再写全体旧 core 的旁路。保留格式兼容，不全站重构、不持网络期锁。
- **优先级/工作量/风险**：P1／L／高；R-IDB。影响全部浏览器编辑、任务和同步。迁移前 fixture、旧 schema 和补丁为回滚点；不通过真实库试错。
- **依赖/受影响**：无任务前置；T-02/T-04/T-05/T-06/T-07/T-12/T-13/T-19 依赖其提交原语。T-05 即使共用事务仍独立验收。
- **验收**：挂起模型时分别保存笔记、收藏、偏好、新增方案和 activeId，释放响应后每项保留，只有原方案 analysis 被更新；两个 tab 修改不同字段最终同时可见；同字段采用明确且可测试的冲突/最后提交策略；陈旧导入不得无提示覆盖新 revision；中途 abort 不留半写记录；旧 v5 fixture 打开/升级后用户资产等价。
- **测试/步骤**：扩充 `tests/indexeddb-storage.test.js`、`tests/local-api.test.js`，用同 IDBFactory 的独立 runtime、可控响应 gate 和事务 abort；运行 `node --test tests/indexeddb-storage.test.js tests/local-api.test.js`。需新增 `tests/browser-storage-concurrency.test.js`：真实 Chromium 同 profile 两 tab 共享 origin，拦截模型、执行上述交错并刷新读 DB；创建后运行 `node --test tests/browser-storage-concurrency.test.js`。原 `storage.cjs` 仅作旧现象参考；完成还需 G 和 fixture 性能。
- **当前状态/验证记录**：已完成；2026-10-08 通过真实 Chromium 双 tab、fake-indexeddb 事务/CAS/abort/旧 v5 兼容及正常 API 用例；最终聚焦 66/66、全量 CI 283/283、隔离 visual/static/perf 门禁通过。证据、清理挂起及修正记录见 E-02。独立提交 `c201acb`（仅T01业务及测试，原未跟踪文档未混入）。2026-10-10 T09集成补验发现新增null字段丢失，修复字段存在性比较后41/41最低版及全CI517/517通过，见E17。

### T-02 — Node 断线恢复不丢离线资产

- **来源/证据/定位**：A-02，P1；原审真实 Chromium/临时 Node：仅 /api/note 断网，返回本地成功，恢复后 notes={}。[app.js:4774](</Users/wilson/Documents/Codex/StarVault Imprint/public/app.js:4774>) api、restoreServerApiMode(:4826)、refreshIndexedDbSnapshot(:5271，:5290 putSnapshot)、loadAll(:10303)。本轮核对回退/覆盖仍在。
- **目标/范围**：按 D-01 实现明确权威、写结果与恢复策略。只读方案需阻止失败写转本地成功并保留存量歧义快照；可写方案需持久 outbox、operationId、dirty 与冲突处理，确认同步后才清除。Node 网络/非 JSON 异常不得让静态模式判定吞掉写失败。静态独立写功能保留。
- **优先级/工作量/风险**：P1／只读方案 M、outbox L／高；R-IDB+R-DB。会改变 Node 离线交互/同步；先展示差异与存量恢复方案，决策后执行。
- **依赖/受影响**：D-01、T-01；选择 outbox 时再依赖 T-12 的请求身份设计。T-15 401/auth 流程须按此错误分类复验；最终数据阶段门禁依赖本任务。
- **验收**：只读方案的断网写明确失败，缓存阅读可用，恢复/刷新不丢已有本地待处置编辑；或 outbox 方案离线写显示待同步，重启仍在，确认同步后两库内容一致。两方案均测试服务端已提交但响应丢失、401、200 非 JSON、临时 404、刷新中断；不自动重发 AI/Star/Fork，不把 auth 失败转本地成功。没有足够元数据的存量本地差异不得静默覆盖。静态首次启动/编辑仍正常。
- **测试/步骤**：需新增 `tests/browser-node-recovery.test.js`，Playwright+临时库服务，先同步假笔记，route 仅 abort note，再恢复并 reload，检查 UI 状态与两侧数据；构造提交后丢响应和存量差异 fixture。创建后运行 `node --test tests/browser-node-recovery.test.js`；现有补充运行 `node --test tests/http-integration.test.js tests/local-api.test.js tests/indexeddb-storage.test.js`。原 offline.cjs 硬编码隔离目录/4188，不直接在工作根改路径运行；新用例用动态临时 cwd/可用端口且不读 .env。加 G/UI 门禁。
- **当前状态/验证记录**：已完成；2026-10-08 按D01只读策略验收，74/74聚焦、318/318 CI、实际恢复下载及阶段1visual/static/perf通过；第一次static间歇失败另记O01，未认定根因。详细记录E08，独立提交 `aa09cc4`。

### T-03 — SQLite writer 之间不读旧值、不丢更新

- **来源/证据/定位**：A-03，P1；V-02 重现 a 丢失。[storage.js:4006](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/storage.js:4006>) load/save(:4025)；[sqlite-store.js:120](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/sqlite-store.js:120>) openState、WAL schema(:69)、core 写入(:192 起)；[run-scan.js:22](</Users/wilson/Documents/Codex/StarVault Imprint/scripts/run-scan.js:22>) 独立 writer。
- **目标/范围**：按 D-02 建立可强制的 writer 契约；保留多 writer 时用 DB revision/事务冲突检测与按记录更新，处理同连接缓存、其他连接及跨进程，不仅检查 mtime/data_version；单 writer 时落实 CLI 路由/互斥与可用性。覆盖全部 storage 写入口和内部 hash/cache 失效；不得用最后保存整个旧 core 消解冲突。
- **优先级/工作量/风险**：P1／L／高；R-DB。影响所有 Node 持久化及 CLI，保存迁移前 DB/schema/关键资产摘要；旧代码与新 schema 的回滚组合须可演练。
- **依赖/受影响**：D-02；无其他任务硬前置。T-04/T-07/T-12/T-14/T-15/T-17 的 Node 结果保存最终依赖此正确性，不能并行提交互相冲突的 storage 修改。
- **验收**：同进程两个 createStorage A/B 预热后 A 写 a，B 必须读取新 a；B 再写 b 后 a/b 都在。两个真实 child process/独立连接交错写 runtime、不同方案笔记/任务时不失写；同一字段冲突明确检测/处理；网络前读旧记录后网络后提交不会覆盖新数据；WAL 未 checkpoint 时一样成立。单 writer 方案还须验证被拒绝 writer/CLI 行为且 standalone 契约符合决策。旧 JSON/SQLite 支持路径和迁移/重启不退化。
- **测试/步骤**：扩充 `tests/sqlite-storage.test.js`、`tests/durable-tasks.test.js`，以 barrier/IPC 控制顺序，不靠 sleep 猜并发；运行 `node --test tests/sqlite-storage.test.js tests/durable-tasks.test.js tests/http-integration.test.js`。`node output/audit-20261008/wal.cjs` 可重现原错误但无 assert，需转正式用例；跨进程 fixture 必须由测试生成新 DB。加 G/fixture 性能；不得跑真实 `npm run scan`。
- **当前状态/验证记录**：已完成；初次提交120e474后由T05回归发现并重新打开cold初始化；补充有界WAL锁重试/schema事务后8个新临时库竞争均通过，Node22.13相关25/25、最终CI298/298，静态/性能预算通过。失败/追加提交记录见E05/E06。生产迁移未执行。

### T-04 — 不完整检索不撤销未验证的方案成员

- **来源/证据/定位**：A-04，P1；原审混合成功/502 扫描移除失败 query 的旧项目，Node 有同根因代码。[local-api.js:1839](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:1839>) browserSearchProfile/runBrowserScan(:1904/:1991)；[server.js:3044](</Users/wilson/Documents/Codex/StarVault Imprint/src/server.js:3044>) 替换条件；[storage.js:4832](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/storage.js:4832>) 成员移除。
- **目标/范围**：最小修复：GitHub 发现阶段任一 query/分页因失败未完成，则本轮只 upsert 成功结果，保留旧成员；保存 incomplete/错误原因供榜单/扫描状态展示。若已有可靠 profile 归属才允许只替换已完整分区；不顺带实现 D-06 的新生命周期。enrichment 失败与 discovery 缺失分开，不把 Tavily 空结果当 GitHub 完整性判断。
- **优先级/工作量/风险**：P1／M／中（成员移除路径按 R-IDB/R-DB 高保护）。可能保留暂时 stale 项目，必须解释本轮不完整；不删除历史资产。
- **依赖/受影响**：T-01、T-05；Node 集成验收需 T-03。T-13 的归档覆盖信息和 T-10 的 provider 错误分类须兼容；D-06 不阻塞最小范围。
- **验收**：两 query 成功/502、第二页失败、429/冷却、全失败/中断时，旧失败分区成员/笔记/收藏仍可达；已成功项目更新正常，本轮覆盖不完整有可见标注；全失败不伪造成功完整榜单。全成功且按既有“发现池”替换时，确实过时的当前方案成员按原契约移除，但不动其他方案。
- **测试/步骤**：扩充 `tests/local-api.test.js`、`tests/server-scan-plan-isolation.test.js`、`tests/server-github-cooldown.test.js`，mock GitHub query/分页失败，断言成员、用户记录、scan/归档状态；运行 `node --test tests/local-api.test.js tests/server-scan-plan-isolation.test.js tests/server-github-cooldown.test.js`。原 scan.cjs 可作 fixture 参考；G 与受影响 UI 状态抽查。
- **当前状态/验证记录**：已完成；2026-10-08 部分 query/分页失败、incomplete_results、全失败、429 与全成功对照通过；真实页面双语/双尺寸提示验收、CI306/306、隔离static/perf通过，记录见E-07。独立提交 `cbe21c0`。

### T-05 — 共享项目保留所有方案关系与历史

- **来源/证据/定位**：A-05，P1；原审 default→newplan 扫描 acme/shared 后 default 池为空。[indexeddb-storage.js:740](</Users/wilson/Documents/Codex/StarVault Imprint/public/indexeddb-storage.js:740>) replaceProjectsForPlan(:748–792)；[local-api.js:1991](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:1991>) 调用。
- **目标/范围**：同一 readwrite 事务按 incoming key 读旧全局项目，合并其他方案 matches、firstSeen/history；当前方案索引只用于本方案过时关系撤销。明确共享字段更新、方案私有字段留存；只有确认无其他关联时才走既有全局移除规则。不实现全库历史回填。
- **优先级/工作量/风险**：P1／M／高；R-IDB。涉及项目行/索引/方案删除，回滚保留迁移前共享项目 fixture。
- **依赖/受影响**：T-01；T-04、T-13 后续复验依赖本任务。即使和 T-01 共用事务补丁，本项关联/history 验收独立保留。
- **验收**：共享仓库先命中 A 再 B、再重扫任一方案，两池均可读；原 firstSeen/snapshots/其他 matches 保留；只移除 A 关系或删除 A 不影响 B，反向同样成立；大小写归一化/重复 incoming 不产生重复或丢关联；事务失败不留半更新索引。
- **测试/步骤**：扩充并运行 `node --test tests/indexeddb-storage.test.js tests/local-api.test.js`；同 IDBFactory 读取真实记录/索引，不只验证内存对象。加 T-01 真实浏览器双方案用例，G/fixture 性能。
- **当前状态/验证记录**：已完成；全局incoming旧行读取/本方案撤销和更新在同一事务，保留其他matches/首次时间/历史；真实双tab、重复大小写、撤销/删除双向关系、abort/重试、legacy默认关联与正常API A→B→A均验收。聚焦70/70、最终CI298/298、static/fixture预算PASS，详见E06。

### T-06 — 跨 tab 原子认领任务并安全恢复

- **来源/证据/定位**：A-07，P2；原审同 taskId 两 runtime GET 使 modelCalls=2。[local-api.js:52](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:52>) localTaskPromises、startLocalTask(:2535/:2564)、任务 GET 恢复(:3131/:3143)。
- **目标/范围**：以 IDB 原子 owner/lease+续租，或有验证覆盖的 origin Web Locks 控制唯一活跃执行者；读取 running 不直接重跑。失去 owner 后停止提交；恢复只能认领明确失效的任务；lease 与 T-11 deadline 一致。缺 Web Locks 时需可靠 IDB 路径或明确不恢复，不能静默退回 tab 内 Map。不承诺外部响应未知时 exactly-once。
- **优先级/工作量/风险**：P2／L／高；R-TASK+R-IDB。会改变旧 running/checkpoint 的恢复时机；保留旧任务 fixture，未知所有权任务不自动付费重跑。
- **依赖/受影响**：T-01、T-11、T-12；T-13 恢复扫描验收依赖本任务。T-07 必须确认无重复学习/结果提交。
- **验收**：两个 tab 同时查询/恢复同任务只有一个活跃 owner和一次正常外部调用；另 tab 仅展示状态。持有者关闭且 lease 到期可接管；旧 owner 再返回不能提交/覆盖新结果；续租失败、tab 挂起、取消、同时竞争、缺 Web Locks 均可预测。外部请求已发送但结果未知时显示不确定/需确认，不盲目重复付费或 GitHub 写。
- **测试/步骤**：扩充 `tests/local-api.test.js`、`tests/indexeddb-storage.test.js` 使用可控 clock/gate；运行 `node --test tests/local-api.test.js tests/indexeddb-storage.test.js tests/durable-tasks.test.js`。需新增 `tests/browser-task-ownership.test.js`，同 context 两真实 Chromium tab、route 模型 gate、关闭 owner，验证 claim/续租/接管/过期提交；创建后 `node --test tests/browser-task-ownership.test.js`。G。
- **当前状态/验证记录**：已完成；原子入队/owner/30秒lease、10秒续租、失主请求取消与全笔提交fencing、未知外部响应不重放、持久artifact恢复均实际验证。真实Chrome双tab/关闭owner/到期恢复和355项CI通过，见E-12。

### T-07 — AI 交付先验收再保存

- **来源/证据/定位**：A-08，P2；V-03 空正文/{} /overloaded/截断 Node 输出仍成功，浏览器 {} 保存空研判。[llm.js:412](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/llm.js:412>) normalizeAnalysisResult、推导(:412–483)、analyzeOpenAICompatible(:1292)；[server.js:2536](</Users/wilson/Documents/Codex/StarVault Imprint/src/server.js:2536>) 保存；[local-api.js:2118](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:2118>) normalizeBrowserAnalysis、保存/学习(:2173)。
- **目标/范围**：在展示归一化/本地推导之前验收可解析业务结果：至少有非空有意义的 summary/verdict；归一化 recommendation 只允许 validate/watch/pause，riskLevel 只允许 low/medium/high，不能用本地风险自动补出模型未交付的积极结论；risks/boundaries/inspirations/validations 为字符串数组，支持现有明确的 sections/别名映射。把允许的旧格式/缺字段规则固定成测试，不把任意服务文本当研判。段落数组可合法为空，不能为了严格而拒绝无风险结论。所有实际启用分析 Provider 路径统一成功条件；无效结果保留旧记录且不写成功学习，不扩展为全部方案生成架构重做。
- **优先级/工作量/风险**：P2／M／中；无效输出可能从原“成功”变为失败，需清楚提示。旧有效分析和成功 fixture 为回滚/比较点。
- **依赖/受影响**：浏览器保存依赖 T-01，Node 最终集成依赖 T-03；T-11 超时和 T-19 endpoint 需兼容。T-06 用有效 schema fixture，不能靠坏响应触发 owner 用例假通过。
- **验收**：空/{}、非 JSON overload、拒答、截断 JSON、非法枚举/字段类型均不完成成功研判、不覆盖旧分析、不产生 ai_analyze 成功事件/provider success。有效 JSON/现有明确支持的文本格式按定义通过；完整业务内容即使 finish_reason=length 也按内容验收，不能机械全部拒绝。中英有效 fixture 和真实任务状态/错误提示正确。
- **测试/步骤**：扩充并运行 `node --test tests/llm-analysis-recommendation.test.js tests/provider-response.test.js tests/analysis-recommendation.test.js tests/local-api.test.js tests/http-integration.test.js`；增加对 API 任务终态、原分析和学习事件数量断言，不只 normalize 输出。G；供应商均 mock。
- **当前状态/验证记录**：已完成；2026-10-09，共享业务结果/原Provider envelope验收后再归一化保存；两端无效交付不覆盖旧研判/学习或标成功，保留明确旧格式。3协议88项+pure21项、实际API两端及Chrome中英/1440/390通过；全CI472/472、官方22.13相关160/160，详E15。

### T-08 — 两端评分可比较且风险语义明确

- **来源/证据/定位**：A-09，P2；V-03 相同 swarm/notes 在 Node 机会分 40/69，浏览器 79/69，risk/overallRisk 定义也不同。[local-api.js:1455](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:1455>) browserProjectScores/githubRepoToProject；[scoring.js:1135](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/scoring.js:1135>) scoreRepository；必要共享边界 [domain-core.js](</Users/wilson/Documents/Codex/StarVault Imprint/public/domain-core.js>)。
- **目标/范围**：按 D-03 定义版本/指标和比较边界，最小共享必要纯评分逻辑或明确区分版本；UI/榜单/导出/导入消费一致。历史 unknown/旧版本不自动冒充新版，不批量重算旧档案，不进行 A-24 整体重构。
- **优先级/工作量/风险**：P2／L／高；R-SCORE。会改变排序/风险解释，须先评审固定案例前后结果和历史兼容/回滚方案。
- **依赖/受影响**：D-03、T-10、T-21；需要保存版本时依赖 T-01/T-03。T-09 的时间窗口和趋势排序不能被新版评分抹掉；T-07 本地风险输入、T-13 榜单生成复验。
- **验收**：选共享方案时相同标准化元数据/信号/策略输入，两端同版本全部分数/风险/解释相同；选区分方案时同名不同定义不再混排/混称，源/版本清晰，导入后依然成立。覆盖 swarm/notes、无许可、未知 Watch、错误 signal、不同方案策略、边界缺值；每个风险字段定义可对应客观断言。旧数据可读、旧档案不被静默重算；不声称新权重现实效果已验证。
- **测试/步骤**：需新增 `tests/scoring-contract.test.js`，加载实际两端函数/共同模块，固定 clock 和输入，选择方案后写对应 parity 或隔离断言；创建后 `node --test tests/scoring-contract.test.js`。回归 `node --test tests/domain-core.test.js tests/learning-driven-discovery.test.js tests/leaderboard-analysis.test.js tests/local-api.test.js tests/sqlite-storage.test.js`；G 和 R-SCORE 对比快照。
- **当前状态/验证记录**：已完成；2026-10-11。D03共享Node候选已实施：核心8/8、120组原Node输出等价；实际SQLite/browserscan/HTTP导出/IDB镜像、两策略/两周期/UTC边界、旧分数/180历史快照/同日档案、未知与未支持版本、风险0和Chrome中英1440/390均验收。最终同一冻结源码官方22.13.0 CI581/581、visual60/0、static子路径及6263项目fixture性能预算通过，语法/secrets/offline/diff通过；原审byte不变。见E29/E30及第12节；独立提交 `ac0dc71`。真实推荐收益、生产迁移/部署未验证。

### T-09 — 趋势显示实际测量时间窗口

- **来源/证据/定位**：A-10，P2；V-03 30 天 200→250 保存 stars=50/complete=true，UI 称前一日。[local-api.js:1954](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:1954>) runBrowserScan trend；[app.js:1469](</Users/wilson/Documents/Codex/StarVault Imprint/public/app.js:1469>) 排序文案、projectTrendHint(:4164)。
- **目标/范围**：浏览器快照差值保存 intervalStart/intervalEnd/source，展示“自上次扫描”及跨度；没有有效基线明确 unknown/incomplete。同一排序入口兼容 Node 真前一日与浏览器区间，不把不同区间称成同一日增量；默认不增加新的在线每日请求。旧记录无 interval 不推断成昨日，已有 Node 真日统计保留。
- **优先级/工作量/风险**：P2／M／中；R-SCORE。影响趋势文案/筛选/排序解释，保存旧 trend fixture；不重写历史时间。
- **依赖/受影响**：T-01；T-08 新指标展示、T-13 归档、T-20/T-22 双语检查需复验。
- **验收**：同日两次、30 天间隔、跨时区/日期边界、首次扫描、缺失/无效 previousAt 都显示实际窗口或未知；不再标伪昨日/complete。Node 真日统计仍按其真实完整性显示。排序/导出/详情/榜单能区分数据窗口，不无说明把 30 天差值排成单日爆发；旧记录和中英文案正确。
- **测试/步骤**：扩充 `tests/local-api.test.js`、`tests/domain-core.test.js`、`tests/i18n-parity.test.js`，固定时钟并检查保存字段和显示格式；运行 `node --test tests/local-api.test.js tests/domain-core.test.js tests/i18n-parity.test.js tests/leaderboard-analysis.test.js`。需在真实 browser 用例新增趋势详情/排序场景（可扩充 T-01 browser 文件），并跑 G/UI 门禁。
- **当前状态/验证记录**：已完成；2026-10-10，实际窗口/配对计数、unknown/0/负值、Node真UTC日、两端排序/中英导出/榜单归档及Chrome1440/390通过。全CI518/518、官方22.13相关74/74、最终冻结源码visual60零问题/static/6263项目fixture性能预算通过；详E18。回滚点4ffa944，不重写历史。

### T-10 — Provider 失败只进诊断，不成为评分证据

- **来源/证据/定位**：A-11，P2；V-03 Tavily/Exa 401 error signal 各使 novelty 28→32、externalMentions=1。[tavily.js:100](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/tavily.js:100>)；[exa.js:179](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/exa.js:179>)；[scoring.js:1166](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/scoring.js:1166>) externalScore、externalMentions(:1295)、buildReasons(:1359)；[server.js:3025](</Users/wilson/Documents/Codex/StarVault Imprint/src/server.js:3025>) 集成。
- **目标/范围**：Provider 返回独立有效 signals 和 status/errors，扫描保留诊断，评分/理由/AI 上下文只消费有效证据；现存错误 signal 使用可证明的标记兼容排除，不把所有 score=0 都当失败。不新增全面证据存储架构。
- **优先级/工作量/风险**：P2／M／中；R-SCORE。失败项目的分数/理由会下降；保留前后 fixture 与错误诊断。
- **依赖/受影响**：无算法决策前置；Node 保存最终复验 T-03。T-08 依赖本任务；T-04 完整性分类与 T-07 AI context 必须兼容。
- **验收**：两 Provider 的 401/429/5xx/网络失败不增加外部提分、mentions、正向 reason，不送作 AI 正向证据；错误仍可见。成功空结果和失败状态区分；有来源且合法零权重/零分的成功记录按定义保留，不用 `weight || 1` 把显式 0 替换成 1。混合成功/失败只计成功，既有有效信号不丢。
- **测试/步骤**：扩充 `tests/exa.test.js`、`tests/provider-response.test.js`、`tests/learning-driven-discovery.test.js`，Tavily 直接 mock 调用补用例；运行 `node --test tests/exa.test.js tests/provider-response.test.js tests/learning-driven-discovery.test.js tests/server-scan-plan-isolation.test.js`。需要跨 Provider→score→保存→AI context 的集成断言，可加入 T-08 新契约测试；G。
- **当前状态/验证记录**：已完成；2026-10-09，两Provider失败与有效证据分离，旧checkpoint和CLI已适配，真实链路及Chrome错误显示/清除通过。全CI492/492、官方22.13相关69/69，详E16。生产历史分数未批量重算。

### T-11 — 请求正文、取消和 AI 预算有完整边界

- **来源/证据/定位**：A-12，P2；原审本地 socket timeoutMs=250 仍约739ms 完成正文，预 aborted 仍发送；V-03 浏览器无 signal/max_tokens。[http-client.js:81](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/http-client.js:81>) mergeSignal、fetchWithRetries(:217–244)、fetchPinnedHttps(:115 起)；[github.js:1126](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/github.js:1126>) 读正文；[local-api.js:2075](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:2075>) callModelJson、fetchWithTimeout(:1284)。
- **目标/范围**：每次尝试 deadline 覆盖连接到完整正文，包含 native fetch 与 pinned HTTPS，设置可配置正文 byte 上限；重试等待支持取消并释放资源。浏览器 AI按分析/方案生成设置明确期限和输出上限，取消/超时错误不伪装 CORS。Node 当前一般20秒、AI45秒/方案75秒可作为保持兼容的起点；浏览器预算必须按调用类型定义，不能把分析700 tokens 生搬到方案生成。模型 POST 响应未知不默认重发；GET 重试仍保留既有预算/Retry-After 契约。
- **优先级/工作量/风险**：P2／M／高；R-TASK。影响全部上游请求、响应读取和重试语义；先保存成功/限流/超时 fixture，修改 helper 后验证每个调用者仍可读正文。
- **依赖/受影响**：无硬任务前置；T-06 依赖 deadline；T-07/T-19 结果/endpoint 回归；T-04 cooldown 和 T-14 释放槽位回归。字节上限/输出预算数值在补丁中明确及测试边界，不以缺调参作为无限等待理由。
- **验收**：本地上游先发 headers 再拖 body，250ms deadline 在容许调度误差（建议≤500ms）内失败/释放，不等700ms；持续慢流一样受整体期限约束；超上限断开并报告，不保存半正文。预取消输入零发送，重试等待取消不再发下一次；成功响应只被消费一次并可正常 .json/.text。浏览器 mock 看到 signal、不同调用类型有限输出预算，timeout/cancel 任务终态明确，lease 不续到无限；AI POST timeout 不自动重复调用。
- **测试/步骤**：扩充并运行 `node --test tests/http-client.test.js tests/provider-response.test.js tests/exa.test.js tests/server-github-cooldown.test.js tests/local-api.test.js tests/llm-analysis-recommendation.test.js`。Node 用临时 HTTP socket、slow body/slow stream/预取消；pinned HTTPS 用现有可注入 transport/本地受控 fixture，不能以外网 timing 为断言。browser fetch mock 必须尊重 AbortSignal，真实浏览器验证取消释放槽位。G。
- **当前状态/验证记录**：已完成；完整正文 deadline、取消、16 MiB 上限、分类型浏览器输出预算及未知 POST 不重发已实际验收，见 E-10；T-06 新增 lease 后仍须独立验证租约随终态释放，不声称当前已存在 lease。

### T-12 — analysis 身份包含方案与完整请求意图

- **来源/证据/定位**：A-13，P2；原审 A 请求挂起，B 同仓库不同需求返回同 taskId、结果仅归 A。[local-api.js:3474](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:3474>) key、enqueueLocalTask(:2599)；[server.js:4121](</Users/wilson/Documents/Codex/StarVault Imprint/src/server.js:4121>) key、enqueueDurableTask(:2708)。
- **目标/范围**：请求身份含显式 planId、规范化 fullname、有效 userNeed/method 等实际影响输出的输入；若分析依赖请求时项目/策略版本，也捕获其 revision。相同有效输入才复用；不同需求独立任务或明确冲突，不能静默复用。task.input 记录归属，显示/提交检查一致。旧 key 任务按已存 input 验证，不凭旧 key 自动绑定当前方案。
- **优先级/工作量/风险**：P2／M／中（恢复按 R-TASK）。可能增加原来被误去重的合理调用，保留相同输入的去重，避免无限新任务。
- **依赖/受影响**：T-01；Node 最终保存需 T-03。T-06、outbox 分支 T-02 依赖此身份；T-13 显式上下文复验。
- **验收**：A/B 同仓库、同方案不同需求/method 不再返回错误任务；有效输入完全相同仍复用；空白规范化规则稳定且不碰撞不同含义，凭据不进入 key/hash/input。任务完成只更新 owning plan；切 activeId 不改变 input；旧 running task、导入和重启不会被误绑定或直接重跑未知副作用。
- **测试/步骤**：扩充并运行 `node --test tests/local-api.test.js tests/durable-tasks.test.js tests/server-scan-plan-isolation.test.js tests/http-integration.test.js`；Node 增真实 /api/analyze 双方案 gate，用两种需求捕获请求并检查结果归属；browser 同 IDBFactory。G。
- **当前状态/验证记录**：已完成；两端独立请求/相同输入去重、请求时材料冻结、方案归属与旧身份未知不重放均实际验证，见 E-11；跨 tab 原子 owner 属于下一项 T-06，未计为本任务已实现。

### T-13 — 扫描派生结果与档案使用 owning plan

- **来源/证据/定位**：A-14，P2；原审 active B 恢复 scan A，A 档案 observationPlan.id=b/items=beta。[local-api.js:1868](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:1868>) runBrowserScan、projectsForActivePlan(:764)、buildLeaderboard(:1005)、归档(:2009–2020)。
- **目标/范围**：项目过滤、summary、偏好/memory、榜单和档案均显式传 owning planId，从该方案读；禁止通过临时切 activeId 纠正。归档提交前验证档案/项目归属，使用 T-01 局部提交；不擅自批量“修复”无法判断的历史档案。
- **优先级/工作量/风险**：P2／M／中；R-TASK/R-IDB。影响后台扫描历史，保留 A/B 不同项目/偏好 fixture 和当前 activeId。
- **依赖/受影响**：T-01、T-05、T-06；T-04 覆盖状态、T-08/T-09 指标更改后需复验本项。
- **验收**：active B 启动/恢复 A，A 池/summary/档案只含 A 合法项目与 A 偏好，planId一致；B档案不变、activeId仍 B。扫描中切方案/双 tab、共享项目分别按各方案记分，档案不混写；任务结束/失败 checkpoint 不重新读 activeId 推导归属。
- **测试/步骤**：扩充并运行 `node --test tests/local-api.test.js tests/scan-plan-binding-ui.test.js tests/leaderboard-analysis.test.js`。local-api 用完整 mock scan 与恢复 fixture，断言 DB 中 archived plan/items，不只 UI选项；T-06 browser 用例加关闭/恢复 A 后选 B 的场景。G。
- **当前状态/验证记录**：已完成；2026-10-09，显式 owning plan 派生/归档、提交事务保护当前 active 镜像；未知归属及冲突 checkpoint 明确失败并保留证据。98项聚焦、真实Chrome租约到期恢复、全量359项CI通过；追加Node冲突checkpoint边界单独通过。见E13与t13-*.log。阶段2完整出口仍待T14。

### T-14 — 队列先筛可运行任务，再按空槽启动

- **来源/证据/定位**：A-15，P2；原审提取真实 pump：两较新冷却 scan+较旧 analysis、空槽2却 started=[]。[server.js:2699](</Users/wilson/Documents/Codex/StarVault Imprint/src/server.js:2699>) pumpDurableTaskQueue、startDurableTask(:2633)；[storage.js:4084](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/storage.js:4084>) listTasks。
- **目标/范围**：获取足够且有界的 queued 候选，按冷却/scan锁/owner谓词筛选后填槽，明确稳定公平顺序；保存最大并发2、单 scan 执行约束。不要简单不断扩大固定 limit 仍遗漏旧可运行任务，不为此新增公共管理接口。
- **优先级/工作量/风险**：P2／M／中；R-TASK。可能改变排队顺序/槽位补充，旧队列 fixture 为比较点。
- **依赖/受影响**：T-03（Node 持久状态）、T-11（取消/失败释放槽位）；T-12 独立 analysis身份回归。无产品决策阻塞。
- **验收**：上述队列有空槽即启动 analysis；busy scan/cooldown 不饿死其他可运行任务；冷却结束 scan 能继续；所有时刻 active≤2、scan≤1；任务完成/异常后槽位归还；持续新任务下既有可运行任务按明确公平规则推进。必须用真实队列/runner组合复现，不能只断言函数源码出现 filter。
- **测试/步骤**：现有运行 `node --test tests/durable-tasks.test.js tests/server-github-cooldown.test.js tests/http-integration.test.js`。需新增 `tests/server-task-queue.test.js`，临时 DB、受控 runner/clock、两 scan+analysis API或内部队列入口，检查 starts/终态/并发；创建后 `node --test tests/server-task-queue.test.js`。若需导出窄测试 seam，限制在模块内部可测试性，不新增线上权限接口。G。
- **当前状态/验证记录**：已完成；2026-10-09，真实finally pump冷却饥饿原版红/补丁绿，正式真实队列覆盖FIFO、失败释放、冷却定时恢复、busy scan及并发约束。全CI360/360、最低Node相关10/10、阶段2视觉/静态/性能门禁PASS，见E14。公平性限于仍保留的队列，独立保留策略缺陷O03未修。

### T-15 — AUTH_TOKEN 模式有认证入口，导出携带认证

- **来源/证据/定位**：A-16，P2；原审 fresh Chromium 401无控件，手动token后API200而CSV401。[app.js:4741](</Users/wilson/Documents/Codex/StarVault Imprint/public/app.js:4741>) get/setAuthToken、api、导出(:12432–12444)；[server.js:4313](</Users/wilson/Documents/Codex/StarVault Imprint/src/server.js:4313>) 认证。
- **目标/范围**：沿用既有 Bearer，为 authRequired/401 提供输入、失败/重试/清除认证流程；正确输入后完成初始化。导出经鉴权 fetch→Blob下载，保留服务端 CSV/JSON Content-Type/文件名/编码；不要用 JSON api wrapper 读 CSV。错误不转本地成功、不放 URL token，不改成多用户系统。
- **优先级/工作量/风险**：P2／M／中；凭据 UI/日志与 URL 禁泄漏，临时假 Token service/profile隔离。恢复为原认证配置+补丁，不删除用户数据。
- **依赖/受影响**：T-02 错误/权威边界；可先实现 UI fixture；导出单元格验收还需 T-17，Node写入回归 T-03。T-22能力展示首次初始化复验。
- **验收**：新 profile 访问假 AUTH_TOKEN服务能找到输入，错误token清楚401且不切本地，正确token加载配置/项目；CSV和JSON实际点击下载200、格式/文件名正确。过期/清除 token重新认证，不清DB；地址/历史/日志/导出不含访问token；无tokenloopback和静态站不出现错误认证阻断。
- **测试/步骤**：扩充 `tests/http-integration.test.js`、`tests/security-boundaries.test.js`；运行 `node --test tests/http-integration.test.js tests/security-boundaries.test.js tests/connection-status-ui.test.js`。需新增 `tests/browser-auth-export.test.js`：临时无 .env 服务设置假 AUTH_TOKEN、Playwright新context，实际填表/click与download读取；创建后 `node --test tests/browser-auth-export.test.js`。G/UI门禁。
- **当前状态/验证记录**：已完成；2026-10-10，回滚点ce56385。真实隔离Chrome四项覆盖首次/错误/过期/清除令牌、provider401区分、无认证loopback/静态模式、zh/en CSV/JSON实际下载；第二轮完整CI529/529、官方22.13.0相关25/25、T02真实缓存回归10/10、最终冻结源码visual/static通过。见E20，首轮环境网络挂起失败保留；新增认证请求15s期限分支未专门注入，不能视为阈值实测。

### T-16 — 发布失败恢复旧前端和 nginx 配置

- **来源/证据/定位**：A-17，P2；有控制流证据，未执行生产失败。[deploy-static.sh:96](</Users/wilson/Documents/Codex/StarVault Imprint/deploy/deploy-static.sh:96>) 先切软链、nginx检查(:117–131)、清理/探针(:134–156)。
- **目标/范围**：记录上一静态目标、上一配置及原来不存在的情况；预检查在可行时切换前完成，切换后任何 nginx检查/reload/必要探针失败恢复两者并验回滚状态，正确保留非零退出与故障原因。版本清理只在成功后，保留本次回滚目标；不顺便改生产拓扑/权限。回滚失败须显式报告，不能假装旧版在线。
- **优先级/工作量/风险**：P2／M／高；R-DEPLOY。修改发布控制流，可能影响首发/升级/回滚；必须先在完全mock/隔离目录演练。真实部署和删除旧releases仍需另行授权。
- **依赖/受影响**：无任务硬前置；本地演练不依赖D-05。未来生产发布需全部相关门禁且A-06去向明确；T-20/T-22修改产物应被探针验版本而不是只HTTP200。
- **验收**：分别注入上传失败、切换失败、nginx -t失败、reload失败、首页/runtime-config/Exa探针失败；有上一版本时静态目标和配置同时恢复、旧页面版本能读、退出非零、不触发清理。原配置不存在/首次发布按明确恢复策略回到原状态；回滚本身失败被单独报告。成功路径切新组合、探针验证后才清理，旧回滚目标不会提前删。两次连续发布不会复用错误 .prev。
- **测试/步骤**：已有语法命令 `bash -n deploy/deploy-static.sh`。需新增 `tests/deploy-static.test.js`，node:test生成临时目录/命令shims或专用隔离remote，断言每阶段失败后的文件、软链和调用序列；创建后 `node --test tests/deploy-static.test.js`。只有确认测试全链路拦截生产HOST/ssh/sudo/rsync/curl且旧版本清理仅指fixture后才运行脚本测试；`bash -n`不算回滚验收。G；不执行正式发布。
- **当前状态/验证记录**：已完成；2026-10-10，最终29项隔离故障矩阵在官方22.13.0全CI566/566中通过，含错误runtime内容联合回滚、连续发布、首发/配置不存在、relative target、六类回滚自身失败与清理失败。bash -n及git diff --check PASS；所有危险命令shim/fixture约束由主线程核对，原审基线reload红测与候选错误日志均保留。见E25/E28；没有生产SSH/nginx/删除，真实TLS仍待D05。独立提交 `8fc8298`。

### T-17 — CSV 中不可信文本按文本打开

- **来源/证据/定位**：A-18，P2；原审真实local export输出 description 单元格为 `=1+1`，未中和，未运行公式。[local-api.js:2737](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:2737>) csvCell/localProjectExport；[server.js:1110](</Users/wilson/Documents/Codex/StarVault Imprint/src/server.js:1110>) csvEscape、CSV(:2511)。
- **目标/范围**：对所有CSV文本字段采用并测试一致中和策略，覆盖 =/+/-/@、前导空白/控制字符；保留CSV语法、双语/换行/Unicode。真实数值字段保持数值语义；JSON原始文本不变。不新增XLSX依赖/更换默认导出格式。
- **优先级/工作量/风险**：P2／S／中；影响下游文本显示，固定CSV/JSONfixture为比较点。不执行危险公式测试。
- **依赖/受影响**：无内容修复硬前置；实际Node鉴权下载依赖T-15，两端读数回归T-03/T-01。与T-15独立验收。
- **验收**：description/name/homepage/笔记等所有实际导出文本入口，经CSV解析后公式串不会作为可执行单元格；引号/逗号/换行不破坏列数，中文/英文不乱码，负数数值不错误变为文本；两端同策略，JSON保持原串。用无害=1+1在目标用户已拥有Excel或WPS实际打开确认为文本；缺客户端时记录该兼容验证阻塞，不能声称已验证电子表格行为。
- **测试/步骤**：需新增 `tests/export-csv.test.js`，通过真实两端export入口读取CSV，用规范CSV解析或受控测试解析器断言完整攻击边界语料/列结构，创建后 `node --test tests/export-csv.test.js`；回归 `node --test tests/local-api.test.js tests/http-integration.test.js`。手工客户端下载验收记录客户端版本、无害样本和显示结果；G。
- **当前状态/验证记录**：已完成；2026-10-10，详见E21。真实两端导出3/3、相关回归55/55、完整CI532/532、官方22.13相关58/58通过。WPS 12.1.26046分别打开实际Node英文CSV、browser中文CSV，C2为文本且非公式、负数趋势为数值的AND检查均TRUE；临时验收公式不保存、两个测试标签已关闭。单引号前缀可见；未验证Excel。回滚点d65fc0f，独立提交 `ae2d133`。

### T-18 — 最低 Node 版本与所有入口一致

- **来源/证据/定位**：A-19，P2；官方22.8SQLite需flag，当前scripts无flag，CI仅latest22；未实跑最低版。[package.json](</Users/wilson/Documents/Codex/StarVault Imprint/package.json>) engines/scripts、[sqlite-store.js:3](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/sqlite-store.js:3>)、[ci.yml](</Users/wilson/Documents/Codex/StarVault Imprint/.github/workflows/ci.yml>)、[README.md](</Users/wilson/Documents/Codex/StarVault Imprint/README.md>)、[README_EN.md](</Users/wilson/Documents/Codex/StarVault Imprint/README_EN.md>)、package-lock根engines。
- **目标/范围**：按D-04同步声明、Node各入口和最低版CI矩阵，核验实际用到的node:sqlite API；文档快速开始能直接运行，不要求新框架。不擅自安装或修改全局Node。
- **优先级/工作量/风险**：P2／S（保留22.8多入口flag为M）／中；改变公开兼容契约，原package/lock/README/CI为回滚点。
- **依赖/受影响**：D-04；不阻塞现有本机修复，但最终全部Node任务最低版本回归受影响，T-03新API尤其要检查。
- **验收**：真实所选最低版本下，按文档命令启动临时库服务，/api/config与SQLite读写正常；所有check/tests/offline入口通过，新CLI入口能够载入并在mock环境运行（不跑真实扫描）。CI精确指定最低版本，另有常用新版本；中英/lock一致。无需flag方案不残留flag说明；保留22.8方案所有子进程入口flag一致；没有实跑版本不得关闭。
- **测试/步骤**：在已提供的所选Node运行环境执行 `node --version`、`npm run ci`、隔离 `npm run perf:storage:fixture`；临时无.env cwd、STORE_PATH新库、HOST=127.0.0.1、RUN_SCAN_ON_BOOT=0，以 `node src/server.js`（保留22.8则决策后的对应flag命令）启动并GET /api/config再停止自己的进程。CI配置新增精确matrix；验证安装只能在获授权/既有CI隔离环境做 `npm ci`。不得用v25.8.2通过代替最低版。
- **当前状态/验证记录**：已完成；2026-10-10，见E23。官方Node22.13.0真实第二轮完整CI532/532、syntax/coverage/secrets/offline/diff PASS；npm dev/start临时库API/SQLite读写均PASS，实际CLI mock成功/失败/empty均PASS，6263项目性能fixture PASS，最低版visual60零问题/static Pages PASS。首轮T06续租观察超时与不改断言的隔离通过、全CI复跑均保留，不掩盖首轮失败。package/lock/双语/CI一致，无experimental-sqlite flag；模块仍有ExperimentalWarning。未触发GitHub Linux CI，不冒称Linux矩阵通过；不替换全局Node。回滚点ae2d133，独立提交 `4173add`。

### T-19 — Provider Base URL 验证与请求共用规则

- **来源/证据/定位**：A-20，P2；V-03 base=/v1 实际请求 /v1/v1/chat/completions。[local-api.js:2044](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:2044>) chatCompletionsUrl、validateBrowserProviderStatus(:1376)、normalizeProvider(:601)/safeSettings(:874)；对照[llm.js:1293](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/llm.js:1293>) Node拼接。
- **目标/范围**：配置保存/导入、模型验证和调用使用同一API base/endpoint解析契约；支持的root、带版本base、已有完整endpoint不重复拼接，不能支持的形式保存时明确拒绝。保留HTTPS/私网/凭据URL限制和生产CSP边界，不因为mock网关可用就扩大域名。
- **优先级/工作量/风险**：P2／M／中；影响旧Provider配置，需要保留defaultDeepSeek和/v1fixture，不能批量改用户真实base。
- **依赖/受影响**：T-01（设置写入）、T-11（请求边界）；T-07有效结果回归。Node规则需核验而不盲目强加“默认root与browser完全相同”的假设。
- **验收**：API/导入保存base=/v1，验证和分析发送到同一版本路径且没有/v1/v1；默认DeepSeek root继续正常；支持的完整endpoint/trailing slash按契约，query/fragment等不支持输入明确报错而不是拼出坏路径；两端安全约束保留，UI不把保存成功当连接成功；生成方案/分析等实际callModelJson调用均用正确endpoint。
- **测试/步骤**：扩充 `tests/local-api.test.js`、`tests/provider-response.test.js`、`tests/security-boundaries.test.js`，从settings/import入口设置假base，再捕获真实调用URL，不能仅直接调用chatCompletionsUrl；运行 `node --test tests/local-api.test.js tests/provider-response.test.js tests/security-boundaries.test.js tests/llm-analysis-recommendation.test.js`。G；不访问真实网关。
- **当前状态/验证记录**：已完成；2026-10-10，详E24，回滚点4173add。真实两端settings/import、模型验证与analysis/plan/tune路径通过；含默认DeepSeek root、显式v1、custom gateway/version、完整endpoint/多trailing slash及空/query/fragment/credentials/HTTP拒绝后原数据与key不变。public browser私网限制、Anthropic/Gemini完整operation回归通过。Chrome兼容相关111/111，官方22.13完整CI563/563、最终同源visual60零问题/static Pages PASS，git diff --check PASS。保留两端原root规则，不重写已有设置/扩大CSP；真实网关CORS/CSP未验证。独立提交 `eaf8c3a`。

### T-20 — 页面与既有 LICENSE 一致

- **来源/证据/定位**：A-21，P2；原审页面MIT与LICENSE非商业许可矛盾，测试还强制MIT。[index.html:577](</Users/wilson/Documents/Codex/StarVault Imprint/public/index.html:577>)、[app.js:16](</Users/wilson/Documents/Codex/StarVault Imprint/public/app.js:16>) /:728 siteFooterCopyright、[static-pages-check.js:141](</Users/wilson/Documents/Codex/StarVault Imprint/scripts/static-pages-check.js:141>) /:148；[LICENSE](</Users/wilson/Documents/Codex/StarVault Imprint/LICENSE>)、双语README。
- **目标/范围**：初始HTML与动态双语footer、相关准确名称/链接/测试一致写既有Source-Available Non-Commercial；不把LICENSE改成MIT，不为修文案引入新许可协议。若提供许可链接，必须使用实际可访问位置并验证静态子路径，不能假定/public自动服务根LICENSE。
- **优先级/工作量/风险**：P2／S／低；局部公开文案/测试，无业务数据迁移。
- **依赖/受影响**：无前置；T-16产物探针/静态验收消费新文案；T-22共同双语回归。
- **验收**：中文/英文、初始HTML/加载后页面、主路径/Pages子路径准确且一致，不再误称MIT/开源许可；LICENSE字节不变，README/徽章有相关声明时一致；若有链接实际200且内容正确。测试断言真实契约，不能简单删除license断言。
- **测试/步骤**：运行 `node --test tests/i18n-parity.test.js`、隔离 `npm run check:static`，更新static checker并实际打开两语言footer；G/UI门禁。`rg -n 'MIT 开源|MIT open source|Source-Available' public scripts README.md README_EN.md LICENSE` 辅助定位，仓库项目自身MIT元数据等合法内容不批量替换。
- **当前状态/验证记录**：已完成；2026-10-10。初始HTML/双语动态footer与static检查改为既有源码可用非商业许可；LICENSE与原基线字节一致、README不变。i18n2/2、完整CI532/532、最终源码visual60零问题、Pages子路径static通过；实际查看390px英文页脚可读且无裁切。见E22；回滚点b4836bb，T17未验收的CSV改动不混入本提交。

### T-21 — Watch 使用真实 subscribers 或未知

- **来源/证据/定位**：A-22，P3；V-03 stargazers=watchers_count=50、subscribers=0却保存watchers50/community52→68。[github.js:1245](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/github.js:1245>) normalizeRepo、[local-api.js:1507](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:1507>) githubRepoToProject、[scoring.js:1192](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/scoring.js:1192>) community项。
- **目标/范围**：新数据存在subscribers_count时取真实值；缺失时unknown并保留缺值标识，评分不以Stars替代。历史watchers来源无法证明时显示unknown/legacy而非真实订阅数，不篡改历史档案。默认不增加逐仓库API请求成本。
- **优先级/工作量/风险**：P3／S／中；R-SCORE。局部community/分数可能下降，版本标注衔接T-08，旧fixture作比较点。
- **依赖/受影响**：无逻辑硬前置；保存字段依赖T-01/T-03，T-08依赖此正确输入；导出T-17须正确显示unknown而非0。
- **验收**：上述fixture新watchers=0、社区不再重复Star；缺subscribers时明确未知、不给Watch加分且不发送额外请求；真实非零值正确；两端归一化一致，0与unknown在UI/JSON/CSV区分。旧记录不会因为数值“像Stars”就擅自算出真实Watch。
- **测试/步骤**：扩充 `tests/local-api.test.js`、`tests/learning-driven-discovery.test.js`、T-08 `scoring-contract.test.js`（新增前不用该命令）；现有运行 `node --test tests/local-api.test.js tests/learning-driven-discovery.test.js tests/provider-response.test.js`，加入实际normalizeRepo fixture/评分断言；G。
- **当前状态/验证记录**：已完成；2026-10-10，两端subscribers字段转换/缺值标识、真实社区加分、旧项目/档案只读视图、JSONCSV中英、Chrome1440/390均通过。全CI525/525、官方22.13相关71/71、最终源码visual60零问题/static/6263项目fixture性能预算通过；详E19。T08版本与比较契约仍待D03，不重写旧分数/档案；业务回滚点ff745cf。

### T-22 — 静态版只显示实际扫描能力

- **来源/证据/定位**：A-23，P3；原审线上tooltip自动08:00，静态无调度器。[local-api.js:3151](</Users/wilson/Documents/Codex/StarVault Imprint/public/local-api.js:3151>) /api/config；[app.js:7158](</Users/wilson/Documents/Codex/StarVault Imprint/public/app.js:7158>) renderConfig；[scheduler.js:23](</Users/wilson/Documents/Codex/StarVault Imprint/src/lib/scheduler.js:23>)、[server.js:4381](</Users/wilson/Documents/Codex/StarVault Imprint/src/server.js:4381>) 启动；Node /api/config 对应返回也在本任务范围。
- **目标/范围**：config返回实际schedulerEnabled/capability，静态显示手动扫描；Node显示实际启用日程与时区。能力未知时不声称每日执行，不增加service worker/后台云调度。
- **优先级/工作量/风险**：P3／S／低；config/UI兼容，无真实数据迁移。
- **依赖/受影响**：无硬前置；T-15鉴权初始化、T-02断线缓存模式须按实际能力显示；T-20一起双语但独立验收。
- **验收**：静态/Pages/no-backend tooltip、aria-label和界面没有自动08:00承诺；Node scheduler正常启用时按实际scanHour/timeZone显示，未启动/未知明确说明；中英一致，不破坏手动扫描或现有Node调度。不能只改scanHour为空制造00:00/NaN。
- **测试/步骤**：扩充并运行 `node --test tests/local-api.test.js tests/connection-status-ui.test.js tests/http-integration.test.js tests/i18n-parity.test.js tests/durable-tasks.test.js`；增加config能力行为断言，真实浏览器检查桌面/移动tooltip与aria；隔离 `npm run check:static`、G/UI门禁。
- **当前状态/验证记录**：已完成；2026-10-10，回滚点eaf8c3a。实际Node调度已/未启动API、readonly cache、unknown/static Pages与Chrome中英1440/390可见tooltip/aria20状态验收通过；初轮旧气泡与fixture MIME问题分别修正并保留证据。官方22.13.0全CI566/566，最终同源visual60零问题/static Pages/6263项目性能预算PASS，见E26/E27末尾。未新增调度器、不改变手动扫描或生产数据。独立提交 `e75bf1a`。

## 7. 执行阶段与依赖顺序

任务编号用于稳定追踪，以下阶段决定执行顺序。共享文件的任务宜串行集成；可以并行编写隔离fixture/独立文案补丁，不并行覆盖同一存储/任务实现。任何被D阻塞的任务可先准备，但不得跳过P1后宣称全局稳定。

| 阶段 | 执行内容与顺序 | 阶段出口 |
|---|---|---|
| 0：基线/决策/失败用例 | 核对V-01、保护现有修改；记录D-01～D-05；建立R-IDB/R-DB/R-TASK/R-DEPLOY fixtures；针对各T新增原版本失败断言 | 可重现报告根因，命令/环境可用，存储/同步/评分重大方案有具体评审。未决D保持待确认，不阻止独立任务 |
| 1：资产完整性 | T-01；T-03在D-02确认后；T-05→T-04；T-02在D-01确认后（outbox身份部分需阶段2 T-12，可提前做T-12） | 各P1独立验收 + G + fixture性能；旧schema/共享项目/断连恢复/同连接及跨进程失写均关闭。若T-02或T-03仍待确认，阶段1未通过 |
| 2：网络与任务 | T-11；T-12；T-06（依赖前二与T-01）；T-13；T-14（依赖T-03/T-11） | 唯一活跃owner、归属正确、可运行任务填槽、deadline与取消有效；R-TASK旧记录恢复用例 + G；阶段1已完成用例无回归 |
| 3：结果与指标 | T-07、T-10、T-09、T-21；D-03确认后T-08最后集成 | 无效结果不成功、失败不提分、时间窗口真实、Watch正确；评分版本/比较契约明确；G及相关UI验证。D-03未决则T-08/阶段出口未通过 |
| 4：接入与公开契约 | T-15（在T-02边界稳定后）；T-17；T-19；T-20；T-22；T-18在D-04确认后 | 真实隔离浏览器认证/下载、CSV目标客户端、base配置、双语/static能力验收；精确最低Node版本门禁 + G/UI/静态 |
| 5：部署恢复与总回归 | T-16本地隔离故障矩阵可提前准备，本阶段集成；D-05决定A-06去向/是否新增T-23；全任务追踪闭环 | 双恢复点演练通过；执行最终G、隔离visual/static/perf。未解决A-06不宣称生产TLS通过；本阶段结束也不自动生产部署 |

低风险独立 T-20/T-22 可在等待重大决策时提前完成，不改变数据优先级。T-18可提前准备CI矩阵，不在未确认前改公开支持范围。高风险任务每个可评审补丁为一个回滚单位，schema迁移单独保留前后fixture；跨任务共用补丁仍保留独立验收记录。

### 依赖摘要（硬实现/最终集成）

- T-01 → T-02/T-05/T-04/T-06/T-07/T-09/T-12/T-13/T-19/T-21 的浏览器持久提交。
- T-03 → T-04/T-07/T-08/T-12/T-14/T-15/T-17/T-21 的 Node 最终写入正确性验收。
- T-05 → T-04/T-13；T-11 → T-06/T-14/T-19；T-12 → T-06，以及可写离线分支的 T-02；T-06 → T-13。
- T-10/T-21 → T-08；T-02 → T-15；T-15 → T-17 的实际鉴权下载验收。
- D-01 → T-02；D-02 → T-03；D-03 → T-08；D-04 → T-18；D-05 → A-06是否追加修复任务与生产安全结论。
- “受影响”表示上游完成后需要复验，不能都当硬前置，避免构造假依赖环。T-08后复验T-07/T-09/T-13、T-15后复验T-22、T-19后复验T-07等是回归边，不阻止先修这些项。

## 8. 范围外记录与后续进入规则

本轮未做新全面审查，未新增A问题。以下来自原报告的未确定观察/附带建议，不自动变为必修T：

| 记录 | 当前证据/去向 | 何时才进入执行范围 |
|---|---|---|
| O-01 CI首次modelCalls=2、重跑通过 | 尚无唯一根因；可能与任务并发/测试隔离相关，T-06/T-12需保留trace，不能认定已被其修复 | 新用例证明独立根因后单列发现与任务，用户确认增补范围；若证明同根因则在对应T补证据 |
| O-02 静态首次back-to-top失败 | 重跑/线上键盘通过；引导时序解释未确定，不制造“按钮坏了”任务 | 真实可复现场景和独立根因成立后增补；不可删现有断言或把重跑当根因 |
| O-03 大池同步计算容量 | 合成6263项目性能预算通过，但list/summary本机约1秒以上；无生产p95/p99/低配证据 | 扩容目标/实际超标证据确认后另做容量计划；本轮只防存储修改带来的预算回归 |
| O-04 英文隐私文案未明确Exa代理例外 | 原报告附带契约文字建议，未单立A | 单独确认文案范围后处理，不借T-20许可修复偷偷扩大隐私声明修改 |

执行中发现新问题先记 `新证据｜场景｜文件/函数｜影响｜是否阻塞现有T｜建议去向`，不直接改范围外代码。若新问题阻塞原T验收，记录已阻塞并提交最小增补方案；用户确认后更新本计划、分配新T并保留原映射。不能为赶进度静默删除、合并或降低原问题。

## 9. 最终交接与完成条件

下一轮从阶段0和可执行的待办任务开始，不需要重读对话。每次更新保存本文件的状态、决策与测试记录；AUDIT_REPORT保留原始结论，计划只记录后续证据/处置。

交接必须包含：

1. A-01～A-26每项仍有去向；T-01～T-22逐项验收、状态和证据。若D-05确认A-06则有独立新增T，不混入T-16关闭。
2. 用户资产、成员关系、任务身份/owner、AI成功、证据/时间/版本、认证/导出和发布组合恢复的不变量实证；每个T满足自己的验收。
3. 实际代码版本、Node/浏览器版本、fixture/日志路径、首次失败及修复依据、旧schema/历史数据兼容证明和回滚点。
4. `npm run ci`及按影响选择的隔离visual/static/perf结果；最低版和CSV客户端缺项明确列出；不声称未运行的供应商/生产/浏览器测试通过。
5. 剩余待确认/已阻塞/已搁置和精确解除条件。阶段完成与生产发布分开，真实库迁移、远端配置和删除/部署需对应授权。

**执行已开始，任务是否完成只看逐项实际验收。尚未关闭的数据完整性风险仍然存在。**


## 10. 执行记录（2026-10-08 起）

### E-00 开工与 baseline

- Git HEAD：d20b69d8bf44cbbb5b38ec86472f18ed6f660192；业务代码无已有差异；AUDIT_REPORT.md/FIX_PLAN.md 已未跟踪。原文备份 output/fix-execution-20261008/original-documents-vuoD24/。这两份原有未提交文档不加入业务任务提交；本文件即时更新继续保持未跟踪，未经授权不把原文混入提交。
- Node v25.8.2；fake-indexeddb 6.2.5、playwright 1.61.1；现有 npx 可用；无前端 build 命令。
- `env GITHUB_TOKEN= TAVILY_API_KEY= EXA_API_KEY= AUTH_TOKEN= ACCESS_TOKEN= PUBLIC_ORIGIN= TRUST_PROXY=0 RUN_SCAN_ON_BOOT=0 npm run ci`：首轮 PASS，256/256；语法/覆盖率/secrets/diff 与 offline plans 10/10。日志 output/fix-execution-20261008/baseline-ci.log。
- 无 .env/data 的隔离副本 /var/folders/84/szrnsvfd7xbfqjxw840q7z_40000gn/T/starvault-fix-baseline-ui-0eNwY5；同样清凭据 loopback 环境执行 `npm run visual:check`、`npm run check:static`、`npm run perf:storage:fixture`，均首轮 exit 0，无重跑。视觉60截图0issues；静态desktop/mobile示例25项目、11assets200、failures空；6263项目性能list1370.6ms/summary836.9ms/write72.4ms，预算PASS。
- 证据 output/fix-execution-20261008/baseline-ui/SUMMARY.md、results.json、各命令.log和artifacts。未访问生产/真Key/用户数据库。原审第一次失败历史仍保留，本次没有用重跑掩盖 baseline 失败。
- D-01、D-02：用户明确确认上述推荐分支；D-03/D-04/D-05尚缺决定/证据。

### E-01 实施中的验证与决策补充

- T-01 仍进行中。新增真实 Chromium 双 tab 回归在原版 4 项中失败 3 项，在初版补丁 4/4 通过；fake-indexeddb/API 联合用例初版补丁 56/56，通过不代表最终关闭。复核发现同根因学习撤销/下限截断并发遗漏，正在补精确操作量重放和独立回归。尚未提交。
- T-03 前置正式失败用例 `node --test tests/sqlite-store-concurrency.test.js`：原版 0/4，分别失败于同连接缓存、真实 IPC 多 writer、旧 load/save 无冲突和异步旧快照无冲突。仅测试准备，Node 存储实现尚未改变。
- D-04 用户已明确批准 >=22.13.0 与隔离下载官方运行时；D-03/D-05 仍待确认。

### E-02 T-01 验收完成

- 修复：IndexedDB v5 保持不变，新增 meta revision。常规快照提交在同一短事务读取最新数据并应用 caller 基线与局部差异；任务 checkpoint 保持独立增量；按原始学习操作量重放截断前 delta（事务成功才消费），保留手动字段最后提交策略；整包导入/同步要求 revision/CAS。跨 runtime 读取校验 revision，凭据设置按已改字段合并；在线请求不因 IDB 缓存不可用被阻断。未访问或迁移真实资料。
- 缺陷证据：原版真实两 tab 4 用例中 3 fail；原版正常 API 长任务笔记被覆盖；初版补丁进一步复现旧笔记撤销下限截断导致并发学习丢失（`t01-learning-browser-before.log`），新增 3 storage/CAS 边界旧行为 fail。不是以仅新增断言数量判断修复。
- 最终针对性命令：`node --test tests/indexeddb-storage.test.js tests/local-api.test.js tests/browser-storage-concurrency.test.js tests/snapshot-sync-ui.test.js`，66/66 PASS、0 skipped（`t01-focused-harness-fixed.log`）。覆盖笔记/收藏/偏好/新增方案/activeId、正确方案分析、双 tab 不同设置/同字段策略、重复 checkpoint、真实 API 学习撤销、旧 v5、abort 后重试、计划删除后不复活、显式 CAS/陈旧全量拒绝及缓存不可用。
- 全量：清凭据环境 `npm run ci`，283/283 PASS、0 fail/skip，语法/覆盖率/secrets/offline plans 10/10/diff PASS（`t01-ci-operations-final.log`）。此后仅修测试服务清理，业务 SHA 不变；新清理路径由上述66项再次验证。
- 已保留失败记录：`t01-integrated-learning.log` 41/42，真实学习数值已过但新断言误指全局 userData；改为实际 plan.userData 后通过。额外 `t01-focused-final-accepted.log` 聚焦复验挂起，停止该测试自建进程；修复其 t.after 为先关 Chrome context 再关自建 HTTP server/连接，不以无限等待或重复绿色掩盖。业务全量 CI 同一版本283/283成功。
- 最终冻结副本：`output/fix-execution-20261008/t01-final-stage/SUMMARY.md`；Node25.8.2/Chrome154.0.8037.98，无.env/data，visual60截图0issues、static failures[]/11assets200、perf6263项目预算PASS（list1529.0ms/summary796.4ms/write66.1ms）。业务精确SHA与仓库一致，旧记录与副本保留；相对baseline门禁无新增失败。
- 运行命令实际均如第5节；日志在 `output/fix-execution-20261008/`。未做生产部署、真实Provider调用或最低Node全量验收，不能据此关闭其他T。回滚为本T独立代码提交与既有v5 fixture；没有schema升级。
- 后续任务红灯准备材料移存到 output（未删除）；T03开工时恢复正式 `tests/sqlite-store-concurrency.test.js`，T05/T04分别集成准备材料，避免未实施任务阻断T01验收。

### E-03 T-03 开工

- T01独立提交 `c201acb` 已生成，提交只含对应业务/测试；原 AUDIT_REPORT.md/FIX_PLAN.md 保持未跟踪。T03按计划下一顺序开始，全部新库/多writer IPC fixture，无生产迁移。
- D04官方最低运行时已准备 `/tmp/starvault-node22130-t18.rOY1d9/node-v22.13.0-darwin-arm64/bin/node`（官方SHA256核验，版本及SQLite烟测通过，证据 t18-runtime-preparation），T03可提前复验必要API；这不代表T18全量验收。

### E-04 T-03 验收完成

- 新增 app_state.revision 行（沿用原表，旧库缺失视0）；短读事务绑定 snapshot revision；所有30个同步 mutator 在 BEGIN IMMEDIATE 后刷新最新数据，再按原dirty记录更新；嵌套项目/榜单写入同一事务，网络不持锁。公开load返回独立快照，save及底层write强制来源路径+revision CAS，force不绕过；冲突/rollback失效cache/hash，SQL零部分写。JSON存储保留既有语义，不声称修复JSON多writer。
- 原正式4用例均fail，修复后真实IPC双进程不同runtime key、多方案笔记/收藏/分析/任务、同字段旧包拒绝、后续fresh写、跨连接项目/榜单/hash、rollback零半写、缺revision旧schema均通过。仅临时fixture，保留路径见日志。
- 主代理补cold初始化：双进程均在IPC ready后首次写新库并导入同一legacy JSON；发现 `database is locked`（t03-cold-initialize.log / t03-node2213-focused.log），调整busy_timeout在WAL设置前生效。修复后cold用例保留两边首写、用户笔记/收藏、legacy bytes未改（t03-cold-initialize-fixed.log）。
- `node --test tests/sqlite-store-concurrency.test.js tests/sqlite-storage.test.js tests/durable-tasks.test.js tests/http-integration.test.js` 第一批24/24（t03-root-focused.log）；新增cold后，官方22.13.0对应bin/node同命令25/25 PASS（t03-node2213-focused-fixed.log）。不代表T18全部入口已验收。
- 清凭据 `npm run ci`：292/292 PASS、0skip/fail，语法/覆盖率/secrets/offline plans10/10/diff通过（t03-ci.log）。隔离无.env/data源码副本 `npm run perf:storage:fixture` exit0，6263项目预算PASS：cold104.2/list1836.4/summary982.2/write64.1ms、heap101.9MB（t03-perf.log，环境t03-perf-environment.json）；只说明预算内，不能宣称真实p95提升。T01浏览器回归包含在全量CI。
- 回滚/投产限制：旧代码可忽略新revision行读取同schema，但会恢复原并发风险；不允许新旧版本writer混跑（旧writer不递增revision）。生产部署须先停全部旧writer并确认一致性备份、启用元数据写入；本轮没有打开真实库、自动部署或生产迁移。

- T03独立提交 `120e474`；T05按阶段开始。准备6项拆为正式T05三项，T04原文件保留，不将未实施T04红灯混入T05 CI。

### E-05 T-03 重新打开与T-05中间验证

- T05第一批62/62；新增真实双tab/abort与删除读写同事务后，聚焦69项中3项失败，因移动projectRecords到try内导致返回计数变量越界；已修为事务内捕获affectedProjects。随后CI297项中295pass/2fail：一项T05新断言将不存在仓库的返回值误写为null（原API是undefined），改为实际项目数量0/方案池空的客观断言；另一项T03cold初始化再次database is locked，不能归为T05或偶发豁免。
- T03定向IPC错误栈透传后第一次诊断即复现createSchema（t03-cold-diagnostics.log）。120e474保留追踪，任务重新进行中，补丁单独追加T03提交。T05实现不混入该提交。

### E-06 T-03追加验收与T-05完成

- T03补充：WAL journal_mode在SQLite忙等待未生效的锁升级场景采用最多5秒有界重试；schema建立在BEGIN IMMEDIATE事务中，同步且无网络；初始化失败关闭该新连接。`t03-cold-lock-fixed.log` 8个独立新库cold IPC竞争全部PASS（专门验证此前复现的间歇根因，不是重跑豁免），Node22.13.0全25项PASS（t03-node2213-lock-final.log）。追加独立T03提交 `2258387`，不和T05合并。
- T05：所有incoming全局行及scope索引在同一readwrite事务读取；保留其他scope matches/私有字段、各scope已有firstSeen和全局firstSeen；history按内容合并、按at排序并沿用180上限；重复大小写仅一行；legacy无显式matches的default索引关联保留。scope删除读取也在原删除事务中，不改变既有删除权限/规则，未执行真实资产删除。
- `node --test tests/discovery-retention.test.js tests/indexeddb-storage.test.js tests/local-api.test.js tests/browser-storage-concurrency.test.js`：70/70 PASS、0 skipped（t05-focused-final-pass.log），包含真实双tab同时A/B更新的3条历史、共享私有字段、A撤销及A/B删除独立结果，abort零半写并可重试，正常API A→B→A重开读库。原T05正式3项2fail/1pass日志t05-before.log保留。
- 最终清凭据 `npm run ci`：298/298 PASS、语法/覆盖率/secrets/offline10/10/diff通过（t05-ci-final-pass.log）。T03/T05各自验收独立，完成一项不自动关闭其它A。
- 精确最终src/sqlite-store和public/indexeddb-storage复制到无.env/data副本后 `npm run check:static`、`npm run perf:storage:fixture` 均exit0（t03-lock-t05-final-*.log）：desktop/mobile/示例重载资源PASS，6263预算PASS（list1514.5/summary1053.6/write77.6ms）。T05没有布局/文案变更，真实双tab功能及静态页面检查覆盖受影响行为；完整60张visual已在T01通过，阶段1末再统一验证T02影响。
- 全阶段1尚未通过：T04/T02仍未完成；生产用户库/真实供应商/真实迁移均未验证，未宣称发布条件成立。

### E-07 T-04 验收完成

- Github query/分页/Trending发现错误和 explicit incomplete_results 均将 discoveryCoverage 标为 complete=false/memberPolicy=retain；成功结果更新，未验证旧成员不撤销。外部 enrichment 错误不反向污染已确定的 GitHub 覆盖状态。扫描与榜单档案保存完整性和原因，全失败不伪造新完整扫描；全成功保持原发现池替换契约，D06未扩展。
- `node --test tests/discovery-retention.test.js`：11/11 PASS（t04-coverage-final.log）；浏览器两query混合502、incomplete_results、全502/429；Node真实runScan第二页502/incomplete_results；笔记收藏可达，成功项目正常更新，全成功对照移除旧成员。已有server cooldown与plan isolation在CI再次通过。
- `node --test tests/scan-coverage-ui.test.js`：1/1 PASS（t04-real-ui-final.log），实际完整静态页1440/390、中英文提示和成功后隐藏，无横向溢出。最初提示在metric内部被移动CSS隐藏，移动到独立panel后桌面grid行高度0，诊断日志保留；最终在section-heading独立全宽行通过，未删除失败断言。截图路径见该日志独立profile。
- 清凭据 `npm run ci`：306/306 PASS、0fail/skip（t04-ci-accepted.log）；语法/覆盖率/secrets/offline plans10/10/diff通过。前轮305/306唯一新增UI失败的t04-ci.log保留。
- 无.env/data副本 t04-gates-environment.json 所列cwd运行 `npm run check:static` 和 `npm run perf:storage:fixture` 均exit0；资源/desktop/mobile/重载PASS，6263 fixture预算PASS（t04-check-static.log、t04-perf-storage-fixture.log）。阶段1完整visual在T02完成后统一复验；本任务独立受影响状态已实测。生产/真实用户库/Provider未触达。
- 回滚为T04独立代码提交；coverage新字段旧记录缺失保持unknown，不回写旧档案。T02尚未验收，阶段1未通过。

### O-01 范围外：静态检查返回顶部间歇失败

阶段1最终副本同时运行visual/static/perf时，static退出1：desktop返回顶部后scrollTop900、按钮仍可见（stage1-check-static.log）。原审baseline也有静态检查首轮失败/重跑通过历史；本轮开工baseline首轮通过。本次未确认根因，也未证明与T02因果关系，不将它宣称为已修复或已确定环境问题。源码返回顶部函数/事件未改动；停止并行负载后同一冻结副本单独 `npm run check:static` exit0、failures[]（stage1-static-isolated-diagnostic.log），首次失败日志保留。此项只记录，不自动加入T队列；如后续再次出现，单独保留运行现场/guide状态/键盘事件证据，避免仅重跑豁免。

### E-08 T-02验收及阶段1出口

- Node API仅静态部署直接本地执行。Node断网/非JSON/临时404时GET可读既有缓存，POST报SERVER_WRITE_UNCONFIRMED，401/403不落本地；响应丢失不自动重试。旧storageMode标记只作离线状态提示，不能切换Node写入权威。离线任务GET显式readOnlyCache，不认领/启动Provider调用。
- IDB v5不升级；未知旧版/本地改动在同一覆盖事务内保存完整core+kv/projects/plans/scans/leaderboards/taskArtifacts恢复副本（meta独立记录），保存失败abort原数据和revision保持。信任标记/本地dirty及核心签名防后续覆盖差异，server缓存写不伪标为本地改动；普通缓存更新和sync串行，sync期间忽略晚到的列表缓存写避免自发CAS冲突。恢复副本不自动删除/上传/应用；project标题中的下载入口和中英README说明手动恢复笔记路径。副本可能含凭据，界面明确披露。
- 正式前置fixture首轮因boot中的列表缓存写与强制sync CAS竞争失败（t02-before.log/t02-first.log）；修fixture等待networkidle后，未修业务cbe21c0隔离副本9项2pass/7fail（t02-before-fixed-fixture.log、t02-red-fixture.json）：证明网络/非JSON/404、提交丢响应、旧差异恢复和离线写缺陷，401-json/static对照保留。第一批业务8/9失败为恢复fixture未等待bootstrap缓存写；最终实现也序列化正常缓存写/sync，未取消CAS保护。记录 t02-fixed-fixture.log。
- `node --test tests/browser-node-recovery.test.js tests/snapshot-sync-ui.test.js tests/indexeddb-storage.test.js tests/local-api.test.js tests/http-integration.test.js tests/browser-storage-concurrency.test.js tests/discovery-retention.test.js` 90/90 PASS（t02-final-focused.log）；追加中英1440/390真实下载、paged refresh中断、只读任务用例后，四文件聚焦74/74 PASS（t02-acceptance.log）。核心10项真实Node+独立profile覆盖断网写、200非JSON、404、401 JSON/HTML、提交后丢响应、旧无dirty差异两次reload/真实下载、只读浏览、静态可写、分页刷新中断恢复；跨tab/旧schema/abort回归仍通过。
- 清凭据 `npm run ci` 最终318/318 PASS、0fail/skip；语法/覆盖率/secrets/offline10/10/diff全部通过（t02-ci-accepted.log；前轮317PASS t02-ci.log）。最终diff未混入原未提交AUDIT/FIX文档。
- 阶段1冻结无.env/data副本见stage1-final-environment.json：`npm run visual:check` exit0，60截图issueCount0；`npm run perf:storage:fixture` exit0，6263预算PASS（list1896.5/summary1328.9/write109.3ms）。`npm run check:static`并发首轮返回顶部失败，停止并发负载后同一副本单独exit0/failures[]，日志分别stage1-check-static.log、stage1-static-isolated-diagnostic.log；根因未确认，独立O01保留，不声称已修复。
- T01/T02/T03/T04/T05各自验收独立，阶段1现有最终门禁通过，并保留O01间歇检查限制。没有生产部署、真实迁移或供应商调用。回滚点为独立T02补丁/v5 fixture；恢复副本仍保留，回滚旧API将重新引入离线写风险。数据层新旧writer不可混跑的T03限制继续有效。下一阶段T11→T12→T06→T13/T14。

### E-09 T-02只读扫描状态补充

- T11复核调用边界时发现GET /api/scan/status 的queued→startLocalTask入口尚未受readOnlyCache约束。补充同一T02根因分支，未扩展任务范围；加强原T02测试到queued任务，分别GET tasks/task/scan-status，均不启动、不变状态、不发Provider。targeted `node --test --test-name-pattern='T-02 read-only Node task cache' tests/local-api.test.js` 1/1 PASS（t02-status-supplement.log）。
- git index仅冻结此一行与T02原测试加强，T11未提交改动不混入（t02-supplement-env.json）。该冻结副本 `npm run ci` 的syntax/coverage318/318通过，因无.git在audit:secrets退出1（环境缺项，t02-supplement-ci.log），不能称整条CI通过；根目录单独 `npm run audit:secrets` exit0（t02-supplement-audit-root.log），冻结副本 `npm run audit:plans:offline` 10/10 PASS，git diff --cached --check PASS。最终根目录全CI在T11验收时再做。无新增UI变化，阶段1原visual/static/perf证据仍保留，O01未关闭。追加独立T02提交，不与T11合并。

### E-10 T-11 验收完成

- Node native fetch/pinned HTTPS 连接至完整正文均有整体期限；decoded body 默认16 MiB，可通过 opts/policy 配置，超限取消且不返回半正文。预取消零发送，Retry-After/backoff 可取消，调用者监听器释放；GET/HEAD/OPTIONS 保留既有重试，未知结果 POST 不自动重发，LLM retries=0。Trending 同步改用该 helper，修复 headers 后提前清 timer 的同一根因。
- 浏览器 GitHub 请求20秒；AI分析/调优45秒、2000 tokens，Provider测试45秒/700，方案生成及质量修复75秒/16000。期限覆盖正文，caller AbortSignal 传递，timeout/cancel/oversize 保留原错误而不误标 CORS。无新增取消 UI；任务失败释放现有执行 Map，T-06 尚未实现 lease，其租约释放回归保留在 T-06 验收中。
- 前置隔离复现7/7失败（t11-preparation/before.log）；750ms慢正文在旧250ms期限下仍约798ms完成。正式 tests/http-lifecycle.test.js 9项覆盖本地 HTTP 慢正文/连续慢流、128字节边界、一次消费、预取消、等待取消、未知 POST 不重发、监听器、注入 pinned TLS验证和真实 Trending 导出函数的受控4秒正文。未调用外网或真实 Provider。原测试参考命令曾误写不存在的 tests/github-trending.test.js，不计该文件为验证；已用现存 http-lifecycle 正式 Trending 用例和最终CI覆盖。
- `node --test tests/http-lifecycle.test.js tests/http-client.test.js tests/provider-response.test.js tests/exa.test.js tests/server-github-cooldown.test.js tests/local-api.test.js tests/llm-analysis-recommendation.test.js` 首轮57/57 PASS；追加边界后 `node --test tests/http-lifecycle.test.js tests/local-api.test.js` 48/48 PASS（t11-final-boundaries.log）。本地API模拟读流超限/超时与预取消均通过；缩短计时仅限测试，正式浏览器使用实际45秒。
- `node --test tests/browser-http-lifecycle.test.js` 真实 Chrome PASS（t11-browser-poll-fixed.log，约46.8秒）：150ms取消、45秒慢正文任务failed、请求各一次/流关闭、未保存分析，后续任务completed；验证700/2000/16000输出预算，坏方案明确failed。测试初版静态服务缺 charset、异步 waitForFunction 谓词错误已修正，失败日志保留，不计为业务回归。
- 清凭据 `npm run ci` 最终331/331 PASS、0fail/skip（t11-ci-accepted.log），syntax/coverage/secrets/offline10/10/diff全部通过。首次CI327项中6失败系 VM fixture 未显式提供 TextDecoder，补齐实际浏览器已有 Web global 后第二次329 PASS，追加两个边界后331 PASS；保留 t11-ci-first.log/second.log。此前T01～T05相关用例全部回归通过，也补足E09根目录CI缺口。
- T11无布局变化，真实功能浏览器已验；阶段2完整UI/静态出口在阶段结束执行，阶段1 O01间歇检查未关闭。独立T11提交；回滚为恢复本提交前 helper/调用者，重新引入原正文超时风险，未变更生产数据。最低Node完整验收仍属于T18，不声称当前所有最低版入口已验收。

### E-11 T-12 验收完成

- analysis 身份包含显式 owning planId、规范化 fullname/context（方法/标签/有效 userNeed）、请求时实际分析材料、语言及不含凭据的 Provider endpoint/id/model/protocol。任务输入保留材料快照，排队后项目变化不替换本请求的材料；执行时 Provider 配置若改变明确失败并要求重新发起，凭据即时读取不进入任务 input/key/hash。canonical JSON 排序对象键；短 hash 仅索引候选，同 key 仍比较完整 canonical identity，不靠 hash 相等复用。
- Node 和 browser 共用最小 context/input identity helper（既有 domain-core）；Node 原提示词清理规则沿用，浏览器采用同一有效输入规范。保留学习使用的 category/useCase/scores/profile matches，未将笔记/既有 analysis/凭据混入模型材料。旧 analysis 缺版本化材料/归属时标 failed、保留原 input、要求重新发起；不凭旧仓库 key 自动绑定当前方案或发送未知请求。
- 为保证身份无 URL 凭据，analysis 创建时明确拒绝 credentials/query/fragment 的 Provider 地址；这是既定 T-19 不支持形式契约的必要入口保护，T-19 的保存/导入/验证/完整 endpoint 修复仍独立待办，不由此关闭或扩大支持范围。
- source-only 65fa189 冻结基线见 t12-before-environment.json（无.env/data）。`STARVAULT_TEST_SOURCE_ROOT=<该路径> node --test --test-name-pattern=T-12 tests/local-api.test.js tests/server-analysis-identity.test.js` 3/3失败（t12-before.log）；初版 Node fixture 在旧代码空白 fullname 404处止步，修正先用相同规范 fullname后单独 Node重跑（t12-node-before-corrected.log），明确复现不同需求返回同 taskId。
- 浏览器 fake-IDB 正常 /api/analyze：同输入含空白/大小写规范仍复用，不同need/method/plan四任务四调用，结果存在各 owning plan、active B不变、输入无凭据；旧 running lookup failed且零Provider请求。Node真实 HTTP API + 临时SQLite、受控HTTPS loopback fetch gate：同样四请求、队列材料更新后仍使用请求时说明、归属正确，启动时旧无归属 running失败不重发。没有真实外网/供应商请求。两端真实跨tab抢占/lease将在T06验收，不声称这里已解决。
- `node --test tests/server-analysis-identity.test.js tests/local-api.test.js tests/durable-tasks.test.js tests/server-scan-plan-isolation.test.js tests/http-integration.test.js` 53/53 PASS（t12-focused.log）；增加 canonical/无凭据/非法URL断言后 `node --test tests/server-analysis-identity.test.js tests/domain-core.test.js` 7/7 PASS（t12-final-boundaries.log）。前两轮失败分别是测试未初始化空IDB快照及使用不符合Node既有HTTPS限制的HTTP假地址，修正fixture后通过，不放宽安全约束，日志保留。
- 清凭据 `npm run ci` 最终335/335 PASS、0fail/skip（t12-ci-accepted.log），syntax/coverage/secrets/offline10/10/diff全部通过，含T11实际45秒Chrome用例、阶段1数据/恢复回归。首轮追加前334 PASS（t12-ci-first.log）。无布局变化，不重复阶段1整套截图；阶段2出口尚未完成，O01/最低Node/T06及其他任务缺口仍保留。
- 独立T12提交；回滚为本提交前 key/context 和即时项目读取，将重新暴露跨需求去重缺陷。旧任务无自动迁移或删除，真实生产库未触碰。下一项T06依赖T01/T11/T12均已满足，按R-TASK/R-IDB隔离实施。

### E-12 T-06 验收完成

- IDB v5保持不升级。CORE任务原子入队/去重及claim，canonical lease独立meta，30秒租约每10秒严格续租；拒过期复活，token+当前input身份在实际写事务内检查。guarded snapshot只可改owning task，项目替换、分析+学习、检查点/档案、artifact均同事务fencing。正常终态原子释放，只有正常交付的同token可清artifact；未知响应隔离后的旧token不能清证据。
- 所有 queued/running保留；达到60活跃任务明确TASK_QUEUE_FULL，原有相同身份仍复用，terminal按既有总上限淘汰。空CORE/无demo工作区先CAS初始化，另一tab初始化获胜时读取其状态，不覆盖。每个执行者claim后取独立fresh snapshot并绑定guard，GET列表不共享执行快照；缺原子存储能力明确停止，不退回tab Map。未使用Web Locks作为前提。
- 每个任务外部请求前持久issued marker并检查owner。模型/付费研究结果未知且owner到期时failed + TASK_OUTCOME_UNKNOWN/recoveryRequired，提示可能执行/计费、要求显式新请求，绝不自动重发；只读GitHub扫描可在到期后接管。续租失败AbortSignal取消在途请求；失主catch不能写失败覆盖接管者。T11的timeout正常终态释放lease，未无限续租。外部响应未知时不承诺exactly-once。
- external-discovery artifact与付费issued标记清除在同一事务；恢复直接读durable artifact而不依赖稍后checkpoint，封住artifact已保存但checkpoint未保存时重发的窗口。原有profile artifact、T04覆盖保留、T05多方案历史继续使用，T13派生归属另行修复。
- 57bff3f source-only前置fixture见t06-before-environment.json；`STARVAULT_TEST_SOURCE_ROOT=<该路径> node --test --test-name-pattern='T-06 two runtimes' tests/local-api.test.js` 实证2次模型请求而非1（t06-before.log）。不涉及外网或真实密钥。
- `node --test tests/indexeddb-storage.test.js` 40/40 PASS；同命令官方临时22.13.0 40/40 PASS（t06-idb-quarantine-fencing.log、t06-idb-quarantine-node22130.log）。包括双runtime原子争抢、队列边界、可控clock过期/续租/接管、旧running/paidunknown隔离、陈旧token/input对结果/学习/project/artifact/cleanup整笔拒绝、非法clock、claim/terminal/artifact事务abort零partial，以及本地提交身份改变/其他task越权修改拒绝。
- `node --test tests/local-api.test.js tests/indexeddb-storage.test.js tests/durable-tasks.test.js` 中间91/91 PASS（t06-focused-final.log；最后一项IDB补强后全CI覆盖）；官方22.13.0集成92/92 PASS（t06-node22130-integration.log，尚未包括随后空CORE用例）；随后官方22.13.0 `node --test --test-name-pattern='T-06 atomic enqueue initializes' tests/local-api.test.js` 1/1 PASS（t06-empty-node22130.log）。`node --test --test-name-pattern=T-06 tests/local-api.test.js` 最后4/4 PASS（t06-local-boundaries.log）：两runtime一个调用/学习提交、续租失败取消且不覆盖未知终态、artifact→checkpoint故障注入仅一次付费研究、无demo空工作区可入队并明确缺Token失败。
- `node --test tests/browser-task-ownership.test.js` 首轮2/2 PASS（t06-browser-first.log）；最终CI再次实际运行：禁用Web Locks，两tab同时POST相同请求同task/一次调用；10秒后lease确已延长，注入到期并由独立observer隔离，旧真实HTTP正文随后到达不写分析/学习；关闭AI和scan owner，真实等待约30秒到期，AI不重发且提示未知，readonly scan恢复完成。测试使用第三observer避免owner选择竞争影响fixture断言。新profile/临时库均保留，未用既有浏览器profile。
- 初轮integration75项72pass/3fail（t06-first-integration.log）：T11测试将新增续租timer误记为请求deadline、旧refresh fixture未模拟owner到期、T12旧错误文案变成更明确unknown outcome。分别限定请求deadline断言并加lease终态检查、显式模拟expiry、兼容unknown文案，未移除原不变量。第二轮local42/42；CI先353、最终补强后354全部通过，追加空CORE用例后最终清凭据 `npm run ci` **355/355 PASS、0fail/skip**（t06-ci-final.log），syntax/coverage/secrets/offline10/10/diff均通过。没有新增布局，阶段2完整出口仍待T13/T14之后，阶段1 O01未关闭。
- 独立T06提交，回滚点57bff3f。旧实现不遵循lease，运行时不能混用旧静态tab与新版任务执行器；升级后旧running无owner明确隔离，需要用户重发。代码回滚不等于恢复已在外部执行的请求；测试和实现未迁移/删除真实生产数据。下一任务T13硬依赖已满足。

### E-13 T-13 验收完成

- 2026-10-09｜执行基线874cf25+本T补丁｜已完成｜public/local-api.js、public/indexeddb-storage.js、src/server.js及三项现有测试。扫描项目过滤、私有状态/watchlist、memory、summary、榜单及archive显式使用任务 owning plan，不临时切换 activeId；归档前检查plan/items归属。IDB guarded scan提交在同一事务保留当前其他方案最新summary/leaderboard镜像，防止陈旧A执行快照覆盖刚切换的B。
- 旧 queued 扫描 input 缺plan时仅可使用明确checkpoint.planId；两者均缺则failed，二者冲突则failed，不推导当前方案、不发送请求、不自动清除历史artifact/checkpoint。Node同样在runner入口拒绝未知/冲突。没有批量修复历史档案或真实数据迁移。
- 原874cf25 source-only冻结基线见t13-before-environment.json：t13-before.log复现A档案id变B；真实Chrome `STARVAULT_TEST_SOURCE_ROOT=<冻结路径> node --test --test-name-pattern=T-13 tests/browser-task-ownership.test.js` FAIL，实际 observer-beta 应为ownerprobe（t13-browser-before.log）。新增旧任务/冲突边界原代码2/2 FAIL、Node原代码FAIL，分别t13-legacy-before.log/t13-node-legacy-before.log。失败记录均保留。
- `node --test tests/local-api.test.js tests/scan-plan-binding-ui.test.js tests/leaderboard-analysis.test.js tests/indexeddb-storage.test.js tests/server-analysis-identity.test.js` **98/98 PASS**（t13-focused-final.log）：恢复A时activeB、扫描途中第二runtime切B、共享项目按A私有状态/偏好计分、A summary/pool/archive正确、B archive/activeId/最新镜像不变，未知/冲突不发请求且artifact保留。
- `node --test --test-name-pattern=T-13 tests/browser-task-ownership.test.js` **1/1 PASS**（t13-browser-final.log，约47.4秒）：实际关闭owner、等待真实30秒lease到期、在B选中状态恢复A；A archive/pool/memory正确，B archive/mirrors不变；AI未知请求不自动重发。测试禁用Web Locks，使用新Chrome profile和loopback mock，无生产/外网调用。
- 清凭据 `env GITHUB_TOKEN= TAVILY_API_KEY= EXA_API_KEY= AUTH_TOKEN= ACCESS_TOKEN= PUBLIC_ORIGIN= TRUST_PROXY=0 RUN_SCAN_ON_BOOT=0 npm run ci` **359/359 PASS、0fail/skip**，syntax/coverage/secrets/offline10/10/diff通过（t13-ci.log）。CI启动后仅追加Node mismatch checkpoint断言，业务无变；`node --test tests/server-analysis-identity.test.js`单独1/1 PASS（t13-node-boundaries.log），明确failed且原checkpoint.planId保留。
- 回滚点874cf25；独立T13提交。旧历史错误档案仍保持原样；生产部署/真实资料未验证。阶段2完整visual/static/perf出口在T14验收后执行；O01及最低Node全入口缺口仍保留，不由本任务关闭。

- T13独立提交 `38e3cfe` 已生成，仅含6个对应业务/测试文件，AUDIT_REPORT.md/FIX_PLAN.md保持原未跟踪。T14现按阶段顺序开始；临时SQLite/loopback mock隔离，目标不改变最大并发2与单scan约束。

### O-02 范围外：扫描刷新目录覆盖自定义 Provider endpoint

2026-10-09，T14扩展fixture首次失败（t14-queue-full-first.log）：先配置HTTPS loopback假Provider，扫描进入目录刷新后，新analysis请求变成https://api.deepseek.com/chat/completions并被mock明确拒绝。src/server.js:780 refreshProviderCatalogIfStale在目录过期时直接覆盖deepseek配置baseUrl/protocol；与原始d20b69d8代码相同（t14-catalog-baseline-evidence.json）。临时SQLite fixture-fHCZf4保留失败任务错误及设置。现有A20/T19仅是URL解析/拼接契约，不自动扩大为目录配置所有权修复。真实Provider未调用；是否允许目录刷新更改用户endpoint须另定，当前不修。T14测试设fresh providerCatalog隔离该既存行为。

该首轮扩展fixture的清理也存在缺陷：150ms后恢复原fetch时queued scan仍在推进，后续一个使用假Token的GitHub /user请求逃出mock并因无效Token失败；未用真实凭据/真实用户库。正式fixture已改为保留mock直至任务全部终态，再恢复fetch；后续验收不能沿用该首轮“无外网”表述。

### O-03 范围外：Node任务保留上限可能淘汰活跃记录

T14核对队列边界发现src/lib/storage.js:createTask按updatedAt保留最近120条，未按active/terminal区分。独立临时库验证见t14-retention-boundary.log：先创建running记录，再创建121条queued后，旧running已查无记录，保留总数120。无runner/Provider/真实数据调用。这是持久队列保留策略根因，独立于A15先limit后filter；未自动纳入修复或更改既有任务清理契约。T14公平性和填槽验收明确限于仍保留的队列，不声称解决无界入队/活跃记录丢失；最终交付需保留此风险。

### E-14 T-14验收及阶段2出口

- 2026-10-09｜执行基线38e3cfe+本T补丁｜已完成｜src/server.js、新增tests/server-task-queue.test.js。pump先读取storage既有硬上限120条的完整保留队列，再按createdAt/id稳定FIFO筛可运行任务，动态填满最大2槽；单scan预留同时检查runningTasks，封住微任务前scanInProgress尚未置位的窗口。enqueue/旧queued复用/resume均统一pump；没有新增公共接口、没有改存储保留策略或生产记录。
- 首条真实API/finally复现：output/fix-execution-20261008/t14-preparation/baseline-38e3cfe冻结旧码，两个API analysis占槽、注入两较新cooldown scan+较旧合法analysis、释放一槽。red-first.log原版0/1：first completed、second running、older queued、Provider calls=2；green-first.log补丁1/1：older running、calls=3、scan queued/attempts0。独立queue.db/observed.json保留，无新pump export。
- `node --test tests/server-task-queue.test.js`正式扩展**1/1 PASS**（t14-queue-accepted.log，约10.2秒）：成功/503失败均释放槽；持续新请求按FIFO不越过既有可运行请求；真实1秒breaker+resume timer到期后scan继续；单scan busy时较旧scan不阻挡analysis；两个scan各attempts1；周期采样和每次Provider/GitHub请求入口均检查active≤2、scan≤1，结束全部queued/running为0。所有后续请求保持mock至队列终态，再恢复fetch。保留fixture-UeFsEF/accepted.json。
- 第一扩展失败t14-queue-full-first.log暴露既存目录覆盖行为及测试清理过早解除mock，详O02；固定fresh目录/清理后，t14-queue-full-fixed.log在等待第二scan的5秒fixture期限失败：实际生产pacer有search2200ms/core350ms，第二scan随后正常completed。扩大该场景期限到12秒以包含A收尾+B校验/预算检查，无业务跳过/缩短pacer；首轮失败与终态库保留。
- `node --test tests/durable-tasks.test.js tests/server-github-cooldown.test.js tests/http-integration.test.js tests/server-analysis-identity.test.js tests/server-scan-plan-isolation.test.js` **13/13 PASS**（t14-existing.log）。官方隔离22.13.0 bin/node `--test tests/server-task-queue.test.js tests/durable-tasks.test.js tests/server-analysis-identity.test.js` **10/10 PASS、0skip**（t14-node22130.log）；不等于T18全部入口通过。
- 清凭据 `npm run ci` **360/360 PASS、0fail/skip**（t14-ci.log）；syntax/coverage/secrets/offline10/10/diff通过。原AUDIT/FIX文档不加入业务提交。T14独立回滚点38e3cfe，任务顺序/扫描预约行为可能改变；回滚将恢复原调度缺陷，不能回滚已执行外部请求。
- 阶段2冻结无.env/data副本见stage2-final-environment.json，保存src/public/scripts精确SHA256。顺序运行清凭据 `npm run visual:check`、`npm run check:static`、`npm run perf:storage:fixture` 均首轮exit0（stage2-visual.log/stage2-static.log/stage2-perf.log）：60张截图0issues、桌面/移动静态及11assets200/示例重载PASS；6263项目性能预算PASS（cold111.7/list1247.9/summary759.5/write77.6ms，heap126.2MB）。不声称生产p95或真实供应商可用。O01此轮未复现但根因未查明、不关闭；O02/O03范围外保留。
- 阶段2的T11/T12/T06/T13/T14各自验收独立，阶段出口适用门禁通过，相对原baseline无已确认新增失败。当前10/22任务完成；下一阶段按T07→T10→T09→T21，T08仍待D03。没有部署、真实库迁移或真实模型调用；生产交付条件尚未成立。

- T14独立提交 `aa13823` 已生成，仅含server与新增真实队列测试；T07正式开工。准备证据 t07-preparation/IMPLEMENTATION_NOTES.md、provider-red.log/browser-red.log/node-api-red.log，全部假Provider/隔离库，未改变用户存量记录。

### E-15 T-07 验收完成

- 2026-10-09｜执行基线aa13823+本T补丁｜已完成｜public/domain-core.js共享validateAnalysisResult/assertAnalysisDelivery；src/lib/llm.js三协议normalizer/envelope gate；public/local-api.js仅analysisProvider路径gate与normalizer；既有local/LLM测试及新增analysis-delivery/analysis-validation/server-analysis-validation/analysis-validation-ui测试。
- 新交付必须是可解析业务对象，summary/verdict/明确marketAngle至少一项非空且含文本；显式enum必须合法，已识别旧alias可映射；缺recommendation/risk采用watch/medium，绝不依本地低风险推导validate/low。canonical四列表必须string[]、允许[]；sections及已知旧scalar alias明确支持，显式[]不被fallback覆盖；节点展示仍按既有长度/3项压缩。旧历史/导入/setAnalysis存储原语不加新gate、不迁移存量。
- 原envelope的error/refusal/safety/content_filter等明确元数据及已知服务/拒答summary被拒绝；完整JSON即使length/max_tokens仍验业务内容，不一律拒绝。不把HTTP200 overload prose/空对象/截断/非法类型保存成功。Schema和明确错误识别不证明模型结论真实，也不声称识别所有自然语言拒答。传输/auth错误仍独立保留；分析失败不进入CORS catch、不自动重发付费POST。计划/调参交付契约未扩改。
- 前置准备红测见t07-preparation：provider-red.log三Node协议27/27无效输出被接受；browser-red.log/node-api-red.log实际API {} 覆盖旧研判、学习+1、provider=ok。provider-matrix-before-v2.log旧码82例21pass/61fail（含有效旧格式兼容缺口），草稿adapter绿色仅为准备证据，不替代正式代码验收。原失败记录全部保留。
- `node --test tests/analysis-validation.test.js tests/analysis-delivery.test.js` **109/109 PASS**（t07-provider-final-boundaries.log）：pure21+真实analyzeWithProvider三协议88项，含中英、sections、显式空列表、旧array/scalar aliases、verdict-only保守默认、完整length/fenced/array text content；拒绝空/{}、overload及JSON伪装服务文本、截断、非法enum/type/alias、refusal/error元数据。每次Provider POST均一次，保持T11 signal/retries=0。
- `node --test --test-name-pattern=T-07 tests/local-api.test.js tests/server-analysis-validation.test.js` **2/2 PASS**（t07-api-first.log）：每端7类无效交付终态failed、错误明确、旧analysis深等/runCount不变、ai_analyze不增、Provider状态仍fixture-before；browser终态lease.expiresAt=0；随后合法新请求completed、学习仅+1、Node runCount仅+1、Provider=ok，总调用各8无重试。Node cwd/tempSQLite隔离，精确loopback HTTPS mock；local fake-IDB独立factory。
- `node --test tests/analysis-validation-ui.test.js` 首轮**1/1 PASS**（t07-real-ui-first.log，约8秒），随后全CI再跑通过：完整静态页、新Chrome profile、1440/390、中英文，真实点击分析按钮，{}与refusal+合法貌似内容均显示invalid错误、旧研判仍可见、按钮释放/任务failed/无新增学习/无横溢；显式合法重试显示新内容、学习仅+1。全部外部URL拦截，假DeepSeek回复；无真实模型或凭据。截图/profile见日志。测试追加明确CORS响应头后由CI覆盖。
- 官方隔离22.13.0 bin/node `--test tests/analysis-validation.test.js tests/analysis-delivery.test.js tests/server-analysis-validation.test.js tests/local-api.test.js` **160/160 PASS、0skip**（t07-node22130.log）。全清凭据 `npm run ci` **472/472 PASS、0fail/skip**（t07-ci-first.log），syntax/coverage/secrets/offline10/10/diff通过；原T01～T14相关用例回归通过。
- 既有llm-analysis-recommendation源码正则强制旧risk推断已改成真实analyzeWithProvider行为：本地risk0+模型未交付enum应watch/medium、空risks仍[]，提示词三enum契约继续检查。CI启动后仅加强该旧测试，业务未变；单独 `node --test tests/llm-analysis-recommendation.test.js` **2/2 PASS**（t07-legacy-contract-test.log），不是删除旧断言掩盖回归。
- 独立T07提交，回滚点aa13823；不合格模型响应由原成功变failed是本任务批准目标，用户旧分析/历史保留。阶段3完整出口尚待T10/T09/T21及D03→T08；此任务没有新布局，实际受影响UI已验，不重复阶段2整套截图。生产库、真实Provider内容质量/命中率未验证。下一项T10，当前11/22任务完成。


### E16 — T-10 / A-11 验收完成（2026-10-09）

- 实施前证据：t10-t21-preparation/probe.log/evidence.json实际8种Provider失败使mentions=1、novelty28→32并进入模型正向reason，显式weight0也误加4；browser原本已分离errors/signals。上述准备红测未被覆盖。
- Tavily/Exa enrichment的Map值改为内部outcome（status/signals/errors）；所有正式调用方server/CLI同步消费signals。错误独立写scan.providerDiagnostics，成功空结果与失败区别；共享externalSignalOutcome只兼容排除可证明的旧enrichment failed标记/明确error，合法score0、weight0、Trending保留。评分入口同一有效集合驱动分数、mentions/reasons，权重仅null/undefined默认1，负值/非有限不提分。
- Node checkpoint单独restoreProviderSignalMap，旧数组转诊断、新outcome幂等恢复；Trending仍用原数组契约。server可选enrichment失败不污染discoveryCoverage：complete池仍replace成员，scan为completed-with-errors并保存独立诊断。CLI实际入口保存同一诊断。browser原错误分离保留，新增诊断及旧artifact兼容；Tavily HTTP错误补status。summary增加中英错误计数和来源/详情title，成功后清空；没有增加外部请求。
- `node --test tests/provider-signals.test.js tests/exa.test.js tests/provider-response.test.js tests/learning-driven-discovery.test.js tests/server-scan-plan-isolation.test.js` **31/31 PASS**（t10-provider-focused-accepted.log）。新增12项：两Provider×401/429/503/network真实enrich→score→临时SQLite→analyzeWithProvider mock prompt，无分数/mentions/正向reason污染；429/503按T11明确响应策略3次、401/network一次；empty/skipped/合法zero、invalid weight、混合旧失败+有效Trending及checkpoint幂等均通过。首轮8fail是测试误用不存在的getSummary，改为真实summary后12/12（t10-provider-focused-second.log），无业务豁免。
- `node --test tests/server-provider-signals.test.js` **7/7 PASS**（t10-server-cli-checkpoint.log）：实际runScan及SQLite task checkpoint写回/重读，双401、success-empty、旧数组和新outcome，错误可读、有效zero保留、恢复不重发Provider；coverage完整和成员替换独立成立。实际CLI subprocess+preload仅mock GitHub discovery，真实Tavily/score/storage验证401/empty/zero-success。假key、空临时cwd、新库，严格fetch白名单；没有项目.env或真实scan。首轮测试错误要求保存不存在的externalSignals原文，已改实际既有聚合/reasons契约（t10-server-cli-first.log/second.log）。
- `node --test tests/provider-signals-ui.test.js tests/scan-coverage-ui.test.js` **2/2 PASS**（t10-ui-final.log），随后全CI覆盖补充HTTP状态断言：实际Chrome静态页/api/scan→IndexedDB→/api/summary，失败双Provider→双空成功→混合一成功一失败；1440/390中英诊断可见/清空、coverage警告保持隐藏、无横溢。fresh profile和截图见日志，所有远程route mock/abort。首轮异步waitForFunction读到running是fixture等待方式错误，改正常task API轮询；没有改变业务任务终态规则。
- 官方隔离22.13.0 bin/node `--test tests/provider-signals.test.js tests/server-provider-signals.test.js tests/local-api.test.js` **69/69 PASS、0skip**（t10-node22130-accepted.log）；单独server/CLI7项同样通过（t10-server-cli-node22130.log）。这不是T18所有入口最低版验收。
- 全清凭据 `npm run ci` **492/492 PASS、0fail/skip**（t10-ci-first.log，约66秒），syntax/coverage/secrets/offline10/10/diff全部通过；相关T01～T14回归通过。T10仅受影响UI验收，阶段3完整visual/static/perf出口留T09/T21及D03→T08后。
- 回滚点7a014ef，独立T10提交；生产历史分数/档案不批量扣分重算，不能从未知旧mentions反推污染。真实Provider内容质量及生产表现未验。O01/O02/O03未自动扩修。当前12/22任务完成，下一项T09。


### E17 — T-01 字段存在性补验与追加修复（2026-10-10）

- T09真实browser archive集成发现growthWindow中的stars/forks/durationMs显式null字段在新归档合并后丢失。定位public/indexeddb-storage.js::mergeChanges：stableJson(undefined)与stableJson(null)均为"null"，新字段未被当作变更；这是A01/T01快照提交的同一边界遗漏，影响T09所需unknown序列化。没有新增问题编号或扩大到数据迁移。
- 新增独立T01正式用例（tests/indexeddb-storage.test.js）先红：`node --test --test-name-pattern='T-01 snapshot merge preserves' tests/indexeddb-storage.test.js` **0/1 FAIL**（t01-null-presence-red.log），新settings.measuredUnknown字段不存在；同时覆盖keyed archive items的nested null及先数字再置null。补丁仅两处比较加入undefined/own-property存在性判断；保留字段级merge、其他tab更新、learning delta、lease fence。
- 官方22.13.0 bin/node `--test tests/indexeddb-storage.test.js` **41/41 PASS、0skip**（t01-null-node22130.log）。定向 `node --test tests/indexeddb-storage.test.js tests/browser-storage-concurrency.test.js tests/browser-task-ownership.test.js tests/local-api.test.js tests/browser-trend-window.test.js` 初轮 **101/102 PASS**（t01-null-integration-first.log），唯一失败为T09新测试误要求历史原排序；T01/T05/T06/T13实际多tab/owner到期/abort/正常API均通过。
- T09测试改为逐条核验历史时间和计数原文保留，兼容已有T05排序。完整 `npm run ci` 初轮516/517仅该fixture断言失败（t09-ci-first.log），修测试后**517/517 PASS、0fail/skip**（t09-ci-accepted.log），syntax/coverage/secrets/offline10/10/diff全部通过。官方22.13相关73/73也通过（t09-node22130-final.log），含T09真实archive null回读。没有弱化null深等验收。
- T01追加独立提交，仅indexeddb-storage.js与其测试；回滚点d589256。T09未提交的其他文件不混入。旧数据库/历史未迁移、未批量重写，T01恢复已完成；T09继续等待自身visual/static/perf门禁。


### E18 — T-09 / A-10 实施与验收完成（2026-10-10）

- T09回滚点4ffa944；T01依赖补丁已独立提交，不与T09混合。T09全部验收通过，状态已完成，独立提交。源修改范围：public/domain-core.js、public/local-api.js、public/app.js、src/lib/github.js、src/lib/storage.js、src/server.js；新增trend-window.test.js/browser-trend-window.test.js/node-trend-window.test.js/trend-window-ui.test.js。
- 原红测 t09-preparation/before.log/observed.json 为真实browser API 9场景、UI函数提取及Node真UTC统计对照，37条目标契约失败；该准备没有Chrome证据，正式Chrome测试另行执行。
- 新browser扫描以共享snapshotTrend配对上一lastSeenAt与计数；缺该时间时只允许同一历史快照的时间/计数一起回退。严格带Z/offset ISO及合法日期，same-instant/future/missing/invalid/首次为unknown/null；保留0和负净变化。保存source/intervalStart/End/period，不作每日折算。describeTrend只为已知真实Node online previous-day契约的旧记录派生UTC日；未缓存/待请求占位不当测量，旧browser/未知source无窗口不猜昨日。
- 两端榜单snapshotGrowth只消费请求滚动周期内两条可证明观测，numeric-time排序；30天旧基线不能作daily奖励，负变化保留但不增加bonus；原权重不变。scoreParts独立保存starDelta/forkDelta（unknown null）和growthWindow（source/kind/实际起止/跨度/所请求周期/coverage），新归档保留元数据，旧档案不迁移/重算。相同时间的计数矛盾使冲突字段unknown，不随意选择一条。
- Node实际GraphQL Stars/Forks上一UTC自然日事件统计保持左闭右开，成功/partial/error均追加真实窗口。趋势排序两端unknown排在已知负值/零之后；文案说明按各自观测区间变化，不把原值当每日速率。中英JSON/CSV导出来源/种类/状态/起止/毫秒跨度；unknown明确缺值，Node沿用空值、browser JSON null/CSV空；真实0仍为0。
- UI在列表/详情/榜单tooltip及可展开详情显示测量来源、区间、跨度和语义；UTC日新增与browser净变化分开，负数无“+-”，实际0与未知分开；窗口已知但计数缺失仍显示已知计数及partial。榜单说明区与rank tooltip显示growthWindow，旧archive没有窗口仅unknown。
- 初轮集成 `node --test tests/trend-window.test.js tests/node-trend-window.test.js tests/browser-trend-window.test.js tests/trend-window-ui.test.js tests/local-api.test.js tests/domain-core.test.js tests/i18n-parity.test.js tests/leaderboard-analysis.test.js` **84/85 PASS**（t09-integrated-first.log），唯一失败揭示T01 null合并遗漏，E17已修。随后Node22.13初轮72/73唯一失败是新测试误要求历史排序不变；实际T05已有排序，改成逐条完整保留时间/计数，保留null深等断言。
- 正式browser API三项已通过（t09-browser-final.log）：11组baseline+同日第二扫、排序、中英JSON/CSV、daily档案持久化/重读。Node实际SQLite/HTTP导出与UTC事件mock两项通过（t09-node-window-first.log及综合日志）。新增矛盾计数用例先红0/1（t09-conflicting-baselines-red.log），修后domain/Node/browser/Chrome 25/25（t09-final-boundaries.log）；最后补未缓存占位与部分计数UI后22/22（t09-final-ui-partial.log）。
- Chrome实际静态页1440/390、中英、30天/30分钟/UTC日/真实0/负值/legacy未知/partial/error/not-cache/部分缺计数，列表、展开详情、排序说明、rank tooltip及无横溢通过。fresh profile与截图保留，所有远程URL阻断。固定时间fixture是2026-10-09，实际执行日期见本节，不混为真实在线数据。
- 全清凭据CI曾517/517（t09-ci-accepted.log）、边界加强后518/518（t09-ci-final.log、t09-ci-final-cache-guard.log）；最新部分计数UI版本的完整 `npm run ci` **518/518 PASS、0fail/skip**（t09-ci-delivery.log），syntax/coverage/secrets/offline10/10/diff全部通过。官方隔离22.13最新domain/Node/browser/IDB/leaderboard相关**74/74 PASS**（t09-node22130-cache-guard.log），不等于T18所有入口最低版验收。
- 前一候选冻结副本 t09-final-environment.json 的visual/static/fixture预算均PASS（t09-final-visual.log/static.log/perf.log）：6263项目，cold89.4ms/list1163.6ms/summary745ms/write60.2ms/heap125MB；最后UI调整后的最终冻结副本 t09-delivery-environment.json（starvault-t09-delivery-a4dw240c）与全部源文件SHA一致：顺序运行 `npm run visual:check` **60场景、issues=[]**（t09-delivery-visual.log）、`npm run check:static` **PASS**（t09-delivery-static.log，desktop/mobile、reload、11资产）、`npm run perf:storage:fixture` **PASS**（t09-delivery-perf.log，6263项目cold138.2ms/list1500.6ms/summary835ms/write88.8ms/heap124MB）。只在无.env/data/.git隔离副本验证，不等于生产性能。
- 本任务不是T08统一评分/调权，没有新增浏览器每日GitHub请求、没有安装/真实Provider/生产库迁移或批量历史改写。阶段3完整出口仍需T21与D03→T08；O01/O02/O03仍独立保留。

- E18结项：当前13/22任务已验收；下一项T21。阶段3出口仍受T21与D03→T08约束。

### E19 — T-21 / A-22 实施与验收完成（2026-10-10）

- 回滚点679ce71；首次正式契约红测 `node --test tests/watchers-contract.test.js` 0/4通过（t21-contract-red.log），证明新helper尚缺及demo字段丢失；尚未验收完成。

- E19中间验证：browser实际扫描/存储/项目list/detail/summary/榜单/中英JSONCSV/旧档案与raw store不变1/1通过（t21-browser-second.log）；首次夹具误用不存在的saveSnapshot，修为实际putSnapshot（t21-browser-first.log）。Node实际SQLite/API/export/archive最终1/1通过（t21-node-third.log）；初轮错误比较整库运行updatedAt，改为逐原始projects/archive深等，第二轮CSV解析简单split不适用于带引号逗号，改为受控规范解析器，不删除数值/原始历史断言（t21-node-first.log/second.log）。
- Chrome1440/390×中英×zero/seven/unknown/legacy共16场景通过（t21-ui-first.log），fresh profile starvault-watchers-ui-AGaaKo保留16截图，所有远程阻断；主代理查看390中文legacy截图。真实详情数据经local API从IDB读取；结束旧record仍watchers50且无新来源字段。官方22.13 `node --test tests/watchers-contract.test.js tests/browser-watchers.test.js tests/node-watchers.test.js tests/local-api.test.js tests/learning-driven-discovery.test.js tests/provider-response.test.js tests/i18n-parity.test.js` **71/71 PASS**（t21-node22130-first.log）。
- 完整CI首轮524项523通过，唯一失败是旧版本Node夹具全库断言（t21-ci-first.log）；修正后525项524通过，唯一失败是T06真实tab续租旧测试10500ms固定等待后的expiresAt延长断言（t21-ci-final.log）。同一业务源码原测试单独1/1通过（t21-lease-isolated-before.log），未证明T21业务回归，也不能把一次重跑当作豁免。T06验收辅助改为15s内观察实际续租（低于30s租约与25s测试总限），保留同token、expiresAt增加>8000ms、单paid request、到期隔离/迟到交付拒绝；追加诊断具体before/after/waitedMs，不改业务timer。等待最终全CI与UI/static门禁，不提前结项。

- E19最终完整 `npm run ci` **525/525 PASS、0fail/skip**（t21-ci-observed-lease.log），syntax/coverage/secrets/offline10/10/diff通过。T06严格观察续租用例单独通过（t21-lease-observed.log：expiresAt延长10004ms，观察等待9916ms），全部CI中同用例亦通过，真实closing-owner/other-plan恢复保留。T06补验test-only独立提交，回滚不会改变业务；T21后续独立业务提交不混入该测试。最终冻结T21业务源码副本 t21-delivery-environment.json 为starvault-t21-delivery-5cxgfd9_，无.env/data/.git，visual正在运行；该门禁前T21仍进行中。

- E19结项实现：共享domain-core::githubWatchers/watcherFact，两端转换只接受有限非负整数subscribers_count（含0），不以watchers_count回退。缺失/null/string/negative/fraction/nonfinite为unknown；无来源旧数值为legacy-unknown，0也不推断。Node社区分只计可信Watch，browser社区仍原Stars/Forks算法，不跨任务调权。Node/storage与browser/local API在list/detail/summary/board/旧archive读视图补状态；中英JSON/CSV添加Watch/来源/状态，known0导出0，unknown为browser JSON null/Node既有空值语义+显式状态，CSV空值。新归档保存事实标识，旧原始项目/分数/档案深等保留。demo构建仅保留原API真实subscribers字段，不重新生成demo或访问GitHub。
- T06辅助测试提交ff745cf；T21最终业务回滚点ff745cf。最终源hash与t21-delivery-environment.json全部一致；顺序隔离 `npm run visual:check` **60场景、issues=[] PASS**（t21-delivery-visual.log）、`npm run check:static` **PASS**（t21-delivery-static.log，desktop/mobile/reload/11assets）、`npm run perf:storage:fixture` **PASS**（t21-delivery-perf.log，6263项目cold93.2ms/list1154ms/summary958.4ms/write82.1ms/heap116.7MB）。只是隔离fixture性能，不等于生产性能。
- 当前14/22已验收；第三阶段T07/T10/T09/T21均完成，T08仍待D03，完整阶段出口尚未通过。按依赖继续阶段4 T15，不绕过T08公共评分决策。不修O01/O02/O03，不改真实库/.env，不部署。

### E20 — T-15 / A-16 实施与验收完成（2026-10-10）

- 回滚点ce56385；只修既有单令牌认证UI和鉴权下载，T02离线缓存/存量保护需回归，供应商401不误触发服务登录。尚未实施或验收完成。

- E20真实Chrome红测 `node --test tests/browser-auth-export.test.js` **0/2 PASS**（t15-browser-red.log），首次401无输入控件、已有Bearer令牌点击CSV没有download；假AUTH_TOKEN、临时SQLite、无.env cwd、远程全拒绝。实施原位Bearer流程、password输入/失败重试/清除、隐藏管理按钮、401 authRequired才展示服务登录（provider401不展示），成功再保存既有sv_token并初始化；认证config请求有15s AbortController边界，不改变凭据存储模型。下载保持既有本地adapter，Node改鉴权fetch→完整Blob，保留原Content-Type/BOM/服务端Content-Disposition文件名，不在URL放令牌。
- 首轮browser **1/2 PASS**（t15-browser-first.log），下载已通过；唯一失败为新测试对英文title大小写误要求，改为不区分大小写真实label匹配后**2/2 PASS**（t15-browser-second.log）。增加无AUTH_TOKEN和静态回归后**2/4 PASS**（t15-browser-third.log）：新管理按钮hidden被已有全局important display覆盖。Chrome诊断证实hidden=true但computed display=flex（t15-unauth-diagnostic.log），补本控件hidden important规则，不全站CSS重构。
- 完整browser **4/4 PASS**（t15-browser-fourth.log）：wrong token不保存、不转本地；正确初始化；真实停止/重启服务轮换AUTH_TOKEN，旧token导出401不导航/不下载、API401重开输入；清除/重连保留IDB marker；provider401不误弹服务认证。1440/390×中英modal无横溢、既有令牌中英CSV/JSON实际按钮四次200下载（header Bearer、服务端文件名、CSV BOM、原始JSON、URL/正文/日志不含token）。无token loopback正确初始化、静态模式无/api请求且真实本地CSV下载。profile与下载文件保留，主代理查看390英文modal截图，发现旧error状态沿用，已局部修正重新打开/连接/清除显式info，并新增断言。
- T02真实Chrome断线/存量差异/恢复备份/静态可写 **10/10 PASS**（t15-node-cache-first.log）；HTTP/security/connection/i18n/snapshot同步 **21/21 PASS**（t15-focused-first.log）。官方22.13第一次相关**25/25 PASS**（t15-node22130-first.log），最后info状态修复后的同组**25/25 PASS**（t15-node22130-final.log）。具体15s超时分支尚未注入慢服务实测，不以声明替代阈值验证；本任务原验收路径全部按上述实测。完整CI与最后冻结visual/static仍待通过。

- E20完整CI首轮 **528/529 PASS**（t15-ci-first.log），T15四项全部通过；唯一失败T11原真实browser慢流deadline得到network error/CORS文案而非timed out，诊断明确 `net::ERR_NETWORK_IO_SUSPENDED`（该日志169行）。该fixture只载domain-core/indexeddb/local-api，无本轮app/index/style修改；这三文件相对ce56385未变。Chromium官方net_error_list.h定义该错误为全部network IO挂起（https://chromium.googlesource.com/chromium/src/net/+/cb6af162c26d4753afb22e6332de6cc8616f8c73/base/net_error_list.h），不能由此认定业务deadline退化，也不宣称已证明具体系统休眠根因。
- 原T11测试同一业务源码独立 `node --test tests/browser-http-lifecycle.test.js` **1/1 PASS、0skip**（t15-t11-isolated-before.log），实际完整45s慢正文期限、取消、槽位释放、预算全部断言保留；没有修改该测试或超时错误规则。完整CI第二轮t15-ci-second.log正在运行，T15仍进行中。

- E20第二轮完整 `npm run ci` **529/529 PASS、0fail/skip**（t15-ci-second.log），syntax/coverage/secrets/offline10/10/diff全通过。T11原browser deadline无改动全CI亦通过；首轮Network IO挂起错误保留。最后冻结副本t15-delivery-environment.json（starvault-t15-delivery-f9v1p5mv）正跑visual，接着static，T15结项前仍进行中。

- E20最终冻结源码 visual:check PASS（t15-delivery-visual.log，60截图、0问题）、check:static PASS（t15-delivery-static.log）；与根目录源码SHA256复核sourceDifferences=[]。T15认证及导出独立结项，不代表阶段4其余任务或生产验收完成。全量529/529、最低版相关25/25及缓存10/10均为同一最终业务源码；没有为首轮网络挂起修改T11断言。

- T15独立提交 b4836bb（6文件，认证UI/鉴权下载/双语说明/真实Chrome测试）；回滚点ce56385。原有未跟踪AUDIT_REPORT.md、FIX_PLAN.md不混入业务提交。

### E21 — T-17 / A-18 导出修复及客户端验收（2026-10-10）

- 基线b4836bb；新增 tests/export-csv.test.js：16项无害文本语料（=、+、-、@、空白/换行/ASCII控制/NBSP/BOM/零宽字符、正常引号逗号Unicode及已中和文本），真实local/IDB与AUTH_TOKEN临时SQLite HTTP导出，逐字段解析CSV并比较原JSON、负数/0语义和底层存量字段。原版正式红测0/3（t17-csv-red-final.log）；最初fixture Response.text自动去BOM的读取错误改成arrayBuffer+Buffer.toString，原始t17-csv-red.log保留，不把该fixture错误当业务问题。
- 原位共享domainCore.csvCell；仅危险开头string前置单引号、随后原CSV语法转义；真实number不作文本中和。local-api.csvCell与server.csvEscape均调用同一函数；JSON路径及底层字段不修改。新测试3/3 PASS（t17-csv-first.log），原local/API/auth下载回归55/55 PASS（t17-related-first.log）。完整CI与最低版结果按实测补记。
- 已安装WPS 12.1.26046（com.kingsoft.wpsoffice.mac），打开临时真实Node CSV starvault-csv-node-wZwVTq/node-en.csv；执行C2读取前工具提示用户已切换到其他文档，动作被拒绝。停止UI操作、未改用户原文档、未更新外部链接、未执行危险公式。已询问用户空闲窗口；WPS真实文本/数值验收尚未完成，T17不能关闭，其他独立任务可继续。该交互阻塞不推断为中和方案失败。

- E21完整CI532/532 PASS（t17-ci-first.log）、官方Node22.13.0相关58/58 PASS（t17-node22130-first.log）；缺WPS单元格行为实测，T17不能据此关闭。

### E22 — T-20 / A-21 许可声明修复验收（2026-10-10）

- 独立于T17的3文件修改：初始HTML/动态中文footer“源码可用非商业许可”、英文“Source-Available Non-Commercial”；static checker保留许可正断言并替换错误MIT承诺。既有README双语已正确，无需改；不新增许可链接，保留现有真实仓库链接。
- LICENSE与原始d20b69d8逐字节SHA256一致，不变更法律文本、不批量替换被监控第三方仓库的MIT属性。i18n-parity通过（t20-i18n-first.log）；最终业务源码冻结t20-delivery-environment.json隔离.env/data/.git，static/visual按实际结果补记。T17未完成的CSV客户端验收仍独立保留，不混入T20提交。

- E22最终 `npm run ci`532/532 PASS（t20-ci-first.log）、i18n2/2 PASS、冻结源码 `npm run visual:check`60截图0问题（t20-delivery-visual.log）、`npm run check:static`Pages子路径中英许可正断言全部PASS（t20-delivery-static.log）；SHA256 sourceDifferences=[]。人工查看390px英文projects截图，完整Source-Available Non-Commercial声明可见无截断。T20独立结项，16/22完成，T17待客户端确认窗口。

- E22 T20独立提交 d65fc0f（app/index/static checker三文件），无T17源代码/测试混入；LICENSE未变。

### E23 — T-18 / A-19 官方最低运行时验收（2026-10-10）

- D04已批准>=22.13.0及临时官方运行时下载验收；现有官方darwin-arm64运行时SHA256 bc1e374e7393e2f4b20e5bbc157d02e9b1fb2c634b2f992136b38fb8ca2023b7，对应/tmp/starvault-node22130-t18.rOY1d9/node-v22.13.0-darwin-arm64；`node --version`实际v22.13.0，不替换系统Node、不安装新依赖。
- package.json、lock根engine、双语README徽章/运行时说明同步22.13.0；quality CI matrix精确22.13.0/最新22/24，visual与Pages构建用22.13.0。新增质量job browser安装步骤、Pages既有安装移到CI前：现有测试有真实Chrome入口，原质量job完全缺浏览器、Pages顺序在测试之后，需让最低版CI环境实际满足现有测试。只修改workflow，不触发远程CI/部署、不在本机安装。
- 冻结当前业务源码 t18-runtime-environment.json 为starvault-t18-runtime-tdew9h_v，无.env/生产data/.git，node_modules只链接既有依赖。保留t18-runtime-acceptance.cjs可复现脚本：官方Node运行实际npm dev/start入口，临时fixture.db与loopback动态端口、外部请求严格拒绝；各GET config/POST note/GET project与另一个SQLite reader确认落盘，两个入口PASS（t18-runtime-acceptance.log/json），无experimental-sqlite启动flag，保留SQLite ExperimentalWarning的真实输出。
- 官方最低版 `npm run perf:storage:fixture`PASS（t18-node22130-perf.log）：6263projects/11plans/120scans/60boards；cold104.5ms、list1212.7ms、summary803ms、incremental78.6ms、heap128.5MiB。原存量无修改。
- 官方最低版完整CI首轮531/532（t18-node22130-ci-first.log），唯一T06真实无WebLocks多标签续租测试在15s等待截止（browser-task-ownership.test.js:66）；其余包括实际CLI成功/失败入口、T03多writer/冷启动、T11deadline全部通过。不能据此关闭T18或声称全CI通过；先原测试隔离复跑、查证续租是否实际兼容性故障，未改业务计时器或验收断言。

- E23原T06验收测试在官方22.13.0隔离 `node --test --test-name-pattern="T-06 real tabs without Web Locks" tests/browser-task-ownership.test.js`1/1 PASS、0skip（t18-lease-isolated-first.log），Observed renewal before1791617615751→after1791617625755，延长10004ms、实际等待9901ms；单次失败未稳定复现，不据此猜测系统挂起或Node缺陷。未改任何T06代码/测试/断言，现同源第二轮完整最低版CI用于确认全门禁。

- E21客户端补验：用户明确批准现在验收临时CSV。WPS 12.1.26046实际打开临时Node英文node-en.csv与浏览器中文browser-zh.csv；C2公式栏均显示单引号加=1+1。空白A19分别输入 `=AND(ISTEXT(C2),NOT(ISFORMULA(C2)),ISNUMBER(Y2),Y2=-5)`（Node）与W2版本（browser），重新选中A19后原生截图均显示TRUE。中文/逗号/引号/多行/Unicode可见且未拆列；危险前缀有可见单引号这一显示代价，不声称其被客户端隐藏。两次super+w均选择“不保存”，只丢弃验收scratch单元格；未编辑现有用户文档、未点外部链接更新。原生连接中断/前台变化时先重新读取、绑定确认browser-zh.csv才继续；最终自身两个测试标签已关闭。t17-wps-acceptance.json记录文件/公式/结果及导出SHA；browser副本与原local-zh.csv逐字节相同。未装/未验证Excel，不推广为所有客户端保证。
- E21结合真实导出3/3、相关55/55、完整CI532/532及官方22.13相关58/58，T17验收完成。复用E22冻结同一业务源码的visual60零问题/static Pages PASS，CSV后没有业务源码变化，T18仅文档/runtime契约变更；T17独立保留编号，当前17/22已完成。

- E21 T17独立提交 ae2d133：domain-core/local-api/server与真实导出测试共4文件；T18文档/CI未混入。

- E23官方最低版第二轮 `PATH=/tmp/starvault-node22130-t18.rOY1d9/node-v22.13.0-darwin-arm64/bin:$PATH npm run ci`532/532 PASS、0fail/skip（t18-node22130-ci-second.log），coverage line86.89/branch63.81/functions85.85超既有阈值，syntax/secrets/offline10用例及额外adversarial PASS、git diff --check通过。实际CLI entry cli-failure/cli-empty/cli-success分别ok469/470/471；T06续租观察before1791617672647→after1791617682916、延长10269ms。无修改T06实现或测试、无扩大deadline。
- E23同一冻结目录官方最低版、空外部keys的 `npm run visual:check`60截图0问题（t18-node22130-visual.log）、随后 `npm run check:static`Pages子路径及中英正断言PASS（t18-node22130-static.log）。回查冻结sha256 sourceDifferences=[]，package/lock engines同>=22.13.0；YAML人工核对矩阵/步骤顺序，现有Python无PyYAML且未安装，仅本机macOS实跑不宣称远程Linux CI或Node24矩阵已运行。T18验收完成，18/22已完成；后续改动仍需最低版最终回归。

- E23 T18独立提交4173add，6个package/lock/README/CI文件，无T17或后续代码混入。

### E24 — T-19 / A-20 API URL 契约实施及验收完成（2026-10-10）

- 回滚点4173add。新增真实browser settings/import/provider-test/analysis/plan-generation捕获URL，以及Node临时SQLite HTTP settings/import/async-analysis、真实llm plan/tune请求捕获测试。browser正式红测0/1（t19-browser-red.log）root验证/models与v1调用不一致；Node首次红测含fixture缺coreKeyword导致T07方案质量拒绝（t19-node-red.log），纠正fixture后正式红测t19-node-red-final.log保留，不把fixture失败当业务缺陷。生产CORS/CSP未验证、不扩展scope。

- E24定向首轮3/3 PASS、related首次101/101、官方22.13 related102/102均为初始候选路径。进一步核对真实Chrome原fixture发现浏览器非版本/model原契约为/model/v1；改成显式版本或完整operation优先、无版本root/gateway保留browser旧v1追加，Node旧root直拼不变，避免无必要改变兼容契约。正式compatible related111/111 PASS（t19-compatible-related.log），包括T01 IDB/owner、T06真实多tab及T11真实45秒deadline/取消，当前未声称全CI通过。NodeAnthropic完整messages与Gemini完整generateContent通过实际调用补验（t19-protocol-first.log），HTTPS/私网/credential边界仍保留。早期冻结visual PASS只属候选版本；最终源码另冻t19-final-environment.json重跑UI/static，不复用已发生源码差异的结果。

- E24最终业务源码SHA sourceDifferences=[]，官方22.13运行visual60截图0问题（t19-visual-final.log）及随后static Pages中英全部PASS（t19-static-final.log）；当前全CI在官方最低版运行，同轮含独立T16的shim演练。测试共用一次门禁但任务编号/验收/提交独立，不混合业务补丁。

### E25 — T-16 / A-17 静态与 nginx 联合恢复演练（2026-10-10）

- 子代理文件归属仅deploy/deploy-static.sh与tests/deploy-static.test.js；主线程完整读取补丁及命令shims。28项每例临时目录，执行前逐一command -v证明ssh/rsync/curl/sudo/systemctl/nginx/rm以及文件写操作指向自有shims；sudo只转发批准命令、ssh只接受deploy-fixture.invalid并解释复制脚本、curl只接受fixture URL，所有可变路径先检查fixture前缀。所有mock rm为rename保留现场，不执行真实网络或系统权限命令；不运行正式发布。
- 原审d20基线隔离reload红例0/1（t16-original-red.log，baseline脚本及test保留output）：退出73，但WEB_ROOT仍新release，NGINX_TARGET仍new nginx fixture。只把原固定/tmp路径映射fixture，其余原控制流不改。首次candidate t16-mock-first.log因runtime-config fixture缺真实注入slot失败，纠正复制真实文件，不当业务缺陷；第二轮23/24抓到候选实现中macOS /var→/private/var canonical路径导致旧目标可能被清理，实际修为readlink -f后比较；第三轮26/26，最终私有恢复目录sudo上传/清理枚举失败传播及新增fixture后最终28/28 PASS（t16-mock-final.log）。主线程未以中间候选PASS替代最终验证，现官方最低版fullCI独立复跑。
- 每发布独立.restore-ID恢复目录、原目标/内容/配置存在性快照；候选先nginx -t，再切软链/复查/reload。上传/切换/配置验校/reload/首页版本/runtime/Exa失败均以原退出码退出，恢复静态目标+配置并验证旧首页hash；首发恢复原先无目标/无配置，不能声称有旧站在线。回滚link/config/nginx/reload/HTTP/首页内容错误独立报回滚失败。验收新release标记/备案/runtime与401INVALID_API_KEY探针后才清理，保护canonical旧目标，连续发布用本次恢复目录；cleanup失败如实报告新版本已验收、清理失败，不伪报回滚。非软链既存WEB_ROOT提前拒绝（保持已有资产）。真实nginx/SSH/TLS线上状态仍未验证，A06/D05不变。

- E24官方最低版完整 `npm run ci`563/563 PASS、0fail/skip（t19-t16-node22130-ci-first.log），syntax/coverage/secrets/offline/diff均PASS。门禁包含T16独立28项shim测试，T19与T16分别记验收、提交不合并。最终同源visual60零问题/static Pages已PASS并SHA=[]；T19验收完成，19/22已完成。

- E24 T19独立提交eaf8c3a（6文件），T16发布脚本/测试未混入。
- E25主线程最低版fullCI563/563包含候选T16 28/28通过。随后依任务版本探针条款补强runtime实际配置：新增runtime-content样本保留正确/api/exa/search字符串但内容为错误server模式，旧候选错误接受（t16-runtime-content-red.log 0/1）。脚本改为比较本次staged runtime文本（两侧命令替换相同去尾换行）并保留代理检查，真实内容不符触发联合回滚；定向runtime-http/runtime-version/runtime-content 3/3 PASS（t16-runtime-content-first.log）。因此先前fullCI不冒称最终T16通过，最终29项及完整门禁仍待跑。

### E26 — T-22 / A-23 实际扫描能力与可见提示（2026-10-10）

- 回滚点eaf8c3a。新增browser-scan-capability.test.js，临时无.env/SQLite子进程真实GET /api/config：先只listen（未start scheduler），再startServer（scanHour6、Pacific/Auckland、无boot/remote），证明scheduler对象已/未启用；fresh Chrome仅loopback静态HTTP的/mirror/starvault/页面，实际local config/static/readOnlyCache，加真实Node config与unknown fixture，两语言1440/390视口20种能力提示截图。原版2/2失败（t22-capability-red.log）因没有能力字段，严格不把Node默认scanHour当已运行日程。
- 首次新增metadata与文案后2/2 PASS（t22-capability-first.log）、官方22.13相关回归通过（t22-node22130-related.log，具体计数随后补记）。主线程实际查看static-390-en/running-1440-zh截图却见旧中文/旧manual气泡，虽然data-tooltip和aria已新状态。补强实际getByRole(tooltip).textContent断言，候选0/1（t22-visible-tooltip-red.log）确认指针不移开时气泡残留。此直接影响本任务运行时能力提示，原位renderConfigDot在目标正悬浮时调用既有showFloatingTooltip刷新文字与位置，不改通用tooltip系统/新增observer；不把初轮属性测试当最终可见双语验收。

- E26最终fixture补正：截图初轮brand图片因测试HTTP服务器把SVG当octet-stream而损坏，修正fixture真实SVG/PNG MIME并新增naturalWidth>0断言，不将该测试服务器错误报告为产品缺陷。官方最低版最终 `node --test tests/browser-scan-capability.test.js` 2/2 PASS（t22-capability-final.log），20张最终截图位于starvault-scheduler-browser-5lXsTx；人工查看static-390-en/running-1440-zh确认英文手动能力与中文实际06:00 Pacific/Auckland气泡可见且无裁切。严格同时验证data/aria与可见tooltip相等。先前官方related70/70仅属候选，最终门禁另记。
- E25/E26最终官方Node22.13.0完整 `npm run ci` 566/566 PASS、0fail/skip（t22-t16-node22130-ci-final.log），包含T16最终29项隔离故障矩阵与T22最终两项API/可见UI验收；coverage line88.36/branch63.58/functions86.81，syntax/secrets/offline/diff PASS。源代码无再修改，隔离最终冻结目录t22-final-environment.json正顺序执行visual/static/perf，尚未以CI一项关闭阶段门禁。

### E27 — D-03 / T-08 具体契约评审准备（2026-10-10）

- 保存t08-decision-probe.cjs、t08-decision-fixtures.json和t08-decision-review.md；固定2026-10-10 clock、同一元数据、无signals/个性化，实际Node/browser函数产生notes机会69/64、swarm35/70、无许可62/55、旧归档32/27。与V03数值不同源于明确固定时间/输入，不将历史样本当当前结果。没有真实数据写入/外部请求，不认定Node算法收益已验证。
- 已异步询问D03：共享现有Node候选（不更换Node权重、项目risk/许可licenseRisk/行动overallRisk分开），或保留两套显式源/版本和不同风险定义。两方案都保留旧分数与档案，仅新扫描/明确重算产新版，按版本分组避免混排；独立代码回滚、无批量生产迁移。用户尚未选择之前不实施T08核心行为。T16/T22独立门禁继续。
- 范围外编号说明：第8节的O01～O04为制定计划时观察；第10节O01～O03为执行中新证据，编号曾重复。保留原记录不静默重编号，引用时必须加“计划观察”或“执行发现”；执行O01=静态时序，执行O02=目录覆盖endpoint，执行O03=保留上限淘汰活跃任务。均未扩大为本轮修复任务。

- E26最后业务源冻结t22-final-environment.json，sourceDifferences=[]（t22-final-source-validation.json）。官方Node22.13.0、全部外部Key清空，顺序 `npm run visual:check` PASS：60截图/0问题（t22-visual-final.log）；随后 `npm run check:static` PASS：Pages子路径/中英/资产MIME（t22-static-final.log）；随后 `npm run perf:storage:fixture` PASS（t22-perf-final.log）：6263项目/11方案/120扫描/60榜单，cold103.2ms/list1208.7ms/summary783.4ms/incremental79.6ms/heap128.5MiB。bash -n部署脚本与git diff --check PASS。T22验收完成，20/22；阶段4任务均已逐项验收，其适用G/UI/static门禁通过，不据此关闭阶段3待D03的T08。T16最终29项及同一G已通过，独立下一步结项，不将T22/T16混成一个提交。

### E28 — T-16 本地结项与剩余追踪（2026-10-10）

- T16最终脚本29项shim演练在官方最低版fullCI566/566全部PASS；所有阶段故障恢复双目标、原退出码/清理顺序/回滚独立失败均客观断言。bash -n与diff检查通过；不以mock声称真实Linux sudo/rsync/nginx配置兼容或在线恢复通过。实际生产发布与删除releases未经授权、未执行；A06/D05仍为独立待确认。
- T22独立提交e75bf1a；T16独立提交8fc8298（回滚点e75bf1a）；T16只提交deploy/deploy-static.sh与tests/deploy-static.test.js，不混入T22或未跟踪文档。当前21/22任务验收完成，T08/D03待确认；阶段3完整出口、全部任务完成与生产交付均尚未成立。阶段5本地回滚专项门禁通过，总追踪仍留T08与A06缺项。

## 11. D03确认前交接快照（2026-10-10；历史节点，最新进度见E29）

代码HEAD：`8fc82981382741ff6c928e5402c6ac2a21b168cf`。相对原始d20基线，21/22任务已按各自标准验收、独立提交；T08仍待D03。原始AUDIT_REPORT与开工备份逐字节一致，未改原审结论；第3节完整26条去向已机器检查无遗漏/重复，第6节22任务状态与Git T编号提交已核对，证据final-traceability.json。FIX_PLAN与AUDIT_REPORT保留原未跟踪状态，不混入25个业务/补验提交；没有推送或发布。

| A编号 | T/去向 | 当前结果 | 独立提交（新→旧）/验证记录 |
|---|---|---|---|
| A-01 | T-01 | 已完成 | 4ffa944, c201acb；第6/10节独立验收 |
| A-02 | T-02 | 已完成 | e2dc7da, aa09cc4；第6/10节独立验收 |
| A-03 | T-03 | 已完成 | 2258387, 120e474；第6/10节独立验收 |
| A-04 | T-04 | 已完成 | cbe21c0；第6/10节独立验收 |
| A-05 | T-05 | 已完成 | 429d634；第6/10节独立验收 |
| A-06 | 待确认 | 待确认 | 未取得生产有效 nginx 配置，可能继承已开启校验；不能当成已确认线上漏洞 |
| A-07 | T-06 | 已完成 | ff745cf, 874cf25；第6/10节独立验收 |
| A-08 | T-07 | 已完成 | 7a014ef；第6/10节独立验收 |
| A-09 | T-08 | 待确认 | D03；仅隔离评审准备，未实施；第6/10节独立验收 |
| A-10 | T-09 | 已完成 | 679ce71；第6/10节独立验收 |
| A-11 | T-10 | 已完成 | d589256；第6/10节独立验收 |
| A-12 | T-11 | 已完成 | 65fa189；第6/10节独立验收 |
| A-13 | T-12 | 已完成 | 57bff3f；第6/10节独立验收 |
| A-14 | T-13 | 已完成 | 38e3cfe；第6/10节独立验收 |
| A-15 | T-14 | 已完成 | aa13823；第6/10节独立验收 |
| A-16 | T-15 | 已完成 | b4836bb；第6/10节独立验收 |
| A-17 | T-16 | 已完成 | 8fc8298；第6/10节独立验收 |
| A-18 | T-17 | 已完成 | ae2d133；第6/10节独立验收 |
| A-19 | T-18 | 已完成 | 4173add；第6/10节独立验收 |
| A-20 | T-19 | 已完成 | eaf8c3a；第6/10节独立验收 |
| A-21 | T-20 | 已完成 | d65fc0f；第6/10节独立验收 |
| A-22 | T-21 | 已完成 | ce56385；第6/10节独立验收 |
| A-23 | T-22 | 已完成 | e75bf1a；第6/10节独立验收 |
| A-24 | 暂缓 | 已搁置 | 整体共享内核/UI 模块拆分是架构投入，超出缺陷修复。T-08 可共享必要纯函数，但不代表关闭 A-24；保留未来独立架构提案 |
| A-25 | 暂缓 | 已搁置 | 完整工作区备份格式是新增产品能力，当前导出边界已披露；本轮仅为高风险修复准备隔离备份。T-06 的 lease 不等于实现完整恢复产品 |
| A-26 | 暂缓 | 已搁置 | Keychain、凭据模型、全面 CSP/证据架构重做无已复现攻击，需单独产品/安全方案。T-07/T-09/T-10/T-11 只修各自具体缺陷，不能自动关闭此建议 |

最终同一业务源码门禁：官方临时Node22.13.0，`npm run ci` 566/566，0fail/cancel/skip，覆盖率88.36/63.58/86.81与syntax/secrets/offline/diff均PASS；隔离无.env/data/.git副本按顺序visual60/0issues、static Pages、perf fixture6263全部PASS。实跑日志t22-t16-node22130-ci-final.log、t22-visual-final.log、t22-static-final.log、t22-perf-final.log；具体复现命令/副本路径/哈希见第5节及E26。相对开工256/256及原阶段预算，无最终已确认新增失败；不同Node版本和机器负载下的耗时不能当性能收益证明。保留首次失败与修正记录，不断言间歇测试根因已全部解决。

未解决/未验证：

- A09/T08为已确认缺陷、等待契约决策，尚无scoringVersion/跨版本隔离，不能以21任务完成掩盖。D03具体前后案例/历史保护/回滚方案见output/fix-execution-20261008/t08-decision-review.md；新的针对性准备还核对了两端榜单独立公式、trend tie-break、多样化/summary独立比较、风险桶和memory、compact/export/AI input白名单、同日档案写入可能覆盖等T08验收边界。未自动修复；决定后逐项纳入同一T08最小范围并补真实往返/历史验收，不开启A24全面重构。
- A06/D05条件性P1仍没有生产有效nginx配置；T16 mock通过不能排除上游TLS验证问题。解除条件为已授权只读有效配置片段及可信CA/名称/verify继承证据，再按第4节决定确认或排除；无需为已完成本地修复再授权。
- A24/25/26按原计划暂缓，无T；既有明文单用户凭据模型、完整恢复产品与全面架构/CSP重构未关闭。
- 执行发现O01静态时序间歇、O02过期目录覆盖custom endpoint、O03任务120上限淘汰活跃记录均未修；计划观察O01原modelCalls首次失败/O03低配容量/O04英文Exa隐私说明仍无独立结论。不得因当前CI绿色称这些全部解决。
- 真实SQLite/IDB生产迁移、生产SSH/nginx回滚、真实Provider/CORS/CSP/内容收益、GitHub Linux CI/Node24矩阵及Excel未实跑。CSV仅已装WPS12.1.26046真实行为通过，单引号可见。Node SQLite仍ExperimentalWarning。T14准备曾泄漏一次假token GitHub/user请求的已保留记录见E14，不宣称整个执行全程零外部请求；没有真实凭据或付费模型调用。

交付判断：已验收21项代码可供独立代码评审与隔离使用；**全计划未完成，尚不具备“全部缺陷已关闭/生产可放心发布”的结论**。阶段1/2和阶段4适用门禁通过，阶段3受T08决策约束；阶段5回滚专项已通过，总闭环仍有上述缺项。未获得决策之前不改变评分/榜单契约、不迁移真实资料。下一步只处理获确认的T08；A06和范围外发现必须按既定进入规则处理。

### E29 — T-08 / A-09 共享评分契约实施（2026-10-10～11）

- 用户已确认共享现有Node规则候选、Node权重不变，三风险定义区分，browser排序可改变；旧分数/榜单档案保留，新扫描/明确重算生成新版，版本分组，独立回滚，无真实数据迁移。D03决策已落地；T08进行中。
- 使用三个有独立文件归属的子代理：共享纯core、Node storage/domain-core版本隔离、app UI。后两者额度中断留下候选文件，由root接手核验，不把代理代码已写视为验收。核心独立8/8 PASS及原eaf8c3a Node源码120组固定输入完整输出等价（仅排除新增版本metadata），logs t08-scoring-core-first.log/t08-scoring-core-node22130.log/t08-scoring-baseline-parity.log。related25/26唯一旧无版本fixture排序期望未改，等待新契约集成。
- 核心UMD新增public/scoring-core.js，Node facade调用同一份，runtime bootstrap及syntax/static资产检查加载新模块；fixture只补加载依赖，不降低原断言。新版metadata scoringVersion=starvault-node-v1、riskSemantics=project-license-action-v1；榜单纯数学/selection与Node个人memory权重共享，leaderboardVersion=starvault-node-board-v1。risk=项目风险，licenseRisk=许可风险，overallRisk=58%项目+42%许可；risk=0不回退为行动风险，legacy定义未知归unknown。
- 新榜单archiveKey用date~scoringVersion~leaderboardVersion，旧daily[date]保留不覆写，IDB/SQLite payload无schema升级；scoreHistory保留原完整scores及版本，旧snapshots原样。root核验unknown分数仅Stars/fullName排序，不跨version按评分竞争；同版current规则不变。最终验收/提交尚未完成，不使用E28的绿色门禁冒称T08通过。

- E29定向入口验收：官方22.13.0 `node --test tests/scoring-version-storage.test.js` 最终6/6 PASS（t08-board-parity-fourth.log）。真实SQLite→IDB分页镜像往返；Node受Bearer保护的实际HTTP中英JSON/CSV；browser公开scan/task入口mock GitHub、两种手动个性化策略/日榜/月榜实际SQLite与browser条目对比；固定UTC2026-10-09T18:30、子进程TZ=Asia/Shanghai跨日期，分数、scoreParts、版本、rank/group及archiveKey相等。新版本归档统一UTC日历，旧本地日历archive key/date原样保留。
- 历史保留边界：180条旧快照+首次新版扫描正式用例最初失败（t08-version-retention-related.log，14/15），定位到IDB `replaceProjectsForPlan` 的二次180裁剪；Node/local-api及IDB均按当前版本保留最近180条，其他旧版本不挤出，完整scoreHistory仅版本/风险契约切换时追加。修复后相关15/15 PASS（t08-version-retention-final.log）；重复当前扫描/180上限、旧score完整存留、旧同日档案、只读不改原project均独立断言。没有真实数据迁移。
- 回归适配记录：首次整体验收579项577通过，仅T09旧未版本化fixture仍期望新版榜单奖励，以及新Node HTTP夹具误用browser/假定中文header。修正夹具为当前评分契约并使用实际“仓库全名”；所有真实旧unknown独立用例保留，旧archive使用返回archiveKey而不猜日期。第二次581项580通过，仅旧dismiss-risk fixture无定义却要求当新版风险使用，现显式标当前契约，同时独立验证未知旧risk/quality不能生成当前risk/quality理由。t08-node22130-ci-first.log/second.log保留，不冒称绿色。
- 榜单parity正式测试初轮揭示legacy riskSemantics缺unknown及未知分数组收到两端不同的无用memoryBoost；当前已显式unknown、旧/未支持版本榜单分数=null、memoryBoost=0并只按Stars/fullName组内排序，不把旧分数套进v1权重；current仍保留原Node权重，版本变化rankChange不称新上榜。策略fixture曾直接写plan.memory后被既有active-memory同步覆盖，改用实际updateMemoryPreference入口并要求boost>0，防止虚假覆盖。各轮日志t08-board-parity-first/third/fourth.log保留。
- 真实Chrome候选UI曾仅检查文本；人工截图发现新增英文Historical标签覆盖数字，追加几何断言真实红测0/1（t08-layout-red.log），只给新增historical指标加局部grid/换行，正式UI+version+旧dismiss相关17/17 PASS（t08-layout-version-related-final.log）。最新12截图starvault-scoring-ui-yvA010，人工查看390英文legacy/current及1440中文board：历史值51/55/41保留，三风险0/82/34分列，unknown不冒充0；标签可换行，定义提示可见。无全UI重构。缺失/无效日期不伪填扫描日期，新增断言及两端入口相关14/14 PASS（t08-final-metadata-related.log）。
- 最終阶段门禁与独立提交仍在执行；本段不是T08完成记录。当前中间t08-node22130-ci-final.log运行期间最后补强未知日期，不能作为同一最终源快照的全门禁证据，后续以稳定源码重跑并单列日志。

- E29收尾新增“未支持显式版本+两种实际用途+diversify=true”断言：首夹具人为填category/useCase被既有withComputedUseCase重推，未真正触发两组，初轮6/6不能证明旁路（t08-unsupported-diversity-red.log）；改为不同实际描述/topics并要求计算后两组，正式红测5/6（t08-unsupported-diversity-red-corrected.log）证明输出100/90/99 Stars而非100/99/90。只将Node多样化的旧版分支由unknown扩大到非当前版本，current权重/多样化不变。related version/UI/i18n最终9/9 PASS（t08-final-closure-related.log）。无同版历史名次的提示改成“无可比历史排名”，不凭空断言存在另一个旧版本。
- 交付源码最终冻结t08-delivery-environment.json（starvault-t08-delivery-gwtjlbjw，无.env/data/.git，111文件SHA）；先前stable源码CI581/581、visual60/0、static均PASS，但不作为上述最后边界修正后的终验。将对delivery冻结源重新按CI→visual→static→fixture perf验收，禁止用先前门禁冒称最后版本通过。
- T08代码回滚点为8fc8298；所有改动集中一个独立T08原子提交，核心/加载/存储/消费缺一会破坏运行，不能分开部署。回滚代码不重算/删除历史；若未来上线后已产生新版资料，回滚前保留新库/IDB原始快照及分数历史，再用上线前备份或独立库验证旧代码，禁止让旧browser scorer继续写入带新版本标记的资料后称“自动兼容降级”。本轮只有临时fixtures，未对真实数据执行该恢复步骤，未声称生产回滚已验收。


### E30 — T-08 最终验收闭环（2026-10-11）

- delivery源码冻结之后无业务修改；官方22.13.0 `npm run ci` 581/581、0 fail/cancel/skip（t08-delivery-ci.log）；src/lib范围coverage87.35/65.15/86.85、syntax/secrets/offline plans/diff PASS。纯共享public核心不在既有coverage统计范围，8项直接行为测试及真实入口parity另验，不以facade的100%声称全业务覆盖。
- 同一delivery无.env/data/.git副本按顺序 `npm run visual:check` 60截图/0issues、`npm run check:static` Pages子路径/双语/所有资产含scoring-core JS MIME正确、`npm run perf:storage:fixture` 6263项目/11方案/120扫描/60榜单全部预算PASS。cold90ms/list566.7ms/summary200.3ms/incremental65.1ms/heap119.1MiB。日志t08-delivery-visual/static/perf.log；t08-delivery-gates.json逐项记录实际退出码0，111文件SHA比对sourceDifferences=[]。不把此合成机器结果当生产容量或推荐效果证明。
- T08已满足验收，22/22纳入任务均完成；阶段3及所有本地适用阶段出口通过。26条发现仍各保留独立编号与处置，A06/D05和A24～26不因T08完成而关闭。未执行生产迁移、GitHub写操作、推送或部署。独立T08提交与提交后secrets/diff/原审字节及A→T/状态核对另记于第12节。

## 12. 最终交接与逐项处置（2026-10-11；当前权威记录）

本节覆盖第11节历史快照。原始基线为 `d20b69d8bf44cbbb5b38ec86472f18ed6f660192`；T08开始前代码回滚点 `8fc82981382741ff6c928e5402c6ac2a21b168cf`。最终代码HEAD为 `ac0dc71f7d34092d927393d2c9b27d8e4d5e6003`，T08独立提交 `ac0dc71`，相对原始基线26个业务/补验提交均可追踪；AUDIT_REPORT保留开工原文，不重写原始审查事实。FIX_PLAN/AUDIT_REPORT保持原未跟踪状态，不混入任何业务提交。

本轮22条已确认并纳入的问题均已解决、22项T均验收通过；没有已纳入但部分解决、未解决或已阻塞的T。A06是尚未确认的条件性问题；A24/25/26为按明确范围暂缓的设计建议。D06更广成员生命周期仍待产品决策，T04仅承诺检索部分失败的历史保护；不能借“22/22”声称永久保留所有全成功扫描样本。

### 12.1 评分契约与维护入口

- 当前评分 `starvault-node-v1`，纯函数位于 `public/scoring-core.js:1192`，Node `src/lib/scoring.js`只转发同一核心；标准化位于前者:892，缺失日期保持空值，有限计数/边界及显式clock均有断言。项目risk、许可licenseRisk、行动overallRisk分别解释，行动值按原Node58%/42%权重取整；仅同一支持版本作分数比较。真实推荐质量没有收益验证。
- `public/domain-core.js`负责version comparator、risk bucket、memory/leaderboard纯数学与selection、:979快照保留和:989scoreHistory转换；`src/lib/storage.js:4839/5522`与`public/local-api.js:1012/2015`是两端实际保存/榜单调用者。新增project字段被summary、分页镜像、实际导出与AI捕获输入保留；UI标新版/历史值，risk=0不回退成行动风险。
- 旧或未支持的版本单独分组，当前版本组优先；不按不同版本分数竞争，旧组按Stars/fullName。旧组新榜单score=null，不假造v1重算；rank为组内排名，rankChange仅有同版/同榜算法历史时才可比。CSV/JSON rank仍为导出行序，新增rankScope明确含义。顶层生成器版本不能代替每条item的scoringVersion判断。
- 新归档使用UTC日期与 `date~scoringVersion~leaderboardVersion` key；旧 `daily[date]`、日期与完整scores不重写。首次新扫描保留旧版本180条快照，当前版本按180上限；完整旧scores只在契约切换时追加scoreHistory，不每次扫描无限重复。已存用户资产、学习偏好与旧分析不批量迁移，不尝试推断未知旧评分来自哪端。
- 回滚需整个T08提交一并恢复到8fc8298；禁止分拆核心/加载/消费者部署。若上线后已写新版资料，先保留原始新资料，再使用上线前备份/独立库验证旧代码；旧browser scorer不能继续写同一个带新版本metadata的库后声称自动安全降级。此生产恢复流程未执行，本轮仅隔离fixtures。

### 12.2 实际整体验收命令与证据

根目录真实Git门禁：

```sh
PATH=/tmp/starvault-node22130-t18.rOY1d9/node-v22.13.0-darwin-arm64/bin:$PATH npm run ci
bash -n deploy/deploy-static.sh
git diff --check
```

结果581/581、0fail/cancel/skip；含T01～22的全部正式测试（scoring核心8、版本/存储/策略6、真实UI1亦在内）。T17额外WPS、T18实际dev/start/CLI和T16受限shim专项，具体命令/步骤、首次失败与最终结果在第6/10节分别记录。每项T不能靠另一项通过代替验收。

最终隔离目录 `/var/folders/84/szrnsvfd7xbfqjxw840q7z_40000gn/T/starvault-t08-delivery-gwtjlbjw`，无.env/data/.git，通过符号链接复用既有node_modules（未安装或修改依赖）；SHA清单位于 `output/fix-execution-20261008/t08-delivery-environment.json`。在该目录按顺序实跑：

```sh
env PATH=/tmp/starvault-node22130-t18.rOY1d9/node-v22.13.0-darwin-arm64/bin:$PATH GITHUB_TOKEN= TAVILY_API_KEY= EXA_API_KEY= AUTH_TOKEN= ACCESS_TOKEN= PUBLIC_ORIGIN= TRUST_PROXY=0 RUN_SCAN_ON_BOOT=0 VISUAL_HOST=127.0.0.1 npm run visual:check
env PATH=/tmp/starvault-node22130-t18.rOY1d9/node-v22.13.0-darwin-arm64/bin:$PATH GITHUB_TOKEN= TAVILY_API_KEY= EXA_API_KEY= AUTH_TOKEN= ACCESS_TOKEN= PUBLIC_ORIGIN= TRUST_PROXY=0 RUN_SCAN_ON_BOOT=0 npm run check:static
env PATH=/tmp/starvault-node22130-t18.rOY1d9/node-v22.13.0-darwin-arm64/bin:$PATH GITHUB_TOKEN= TAVILY_API_KEY= EXA_API_KEY= AUTH_TOKEN= ACCESS_TOKEN= PUBLIC_ORIGIN= TRUST_PROXY=0 RUN_SCAN_ON_BOOT=0 npm run perf:storage:fixture
```

三项退出码0：60截图/0问题、隔离根路径/Pages样式子路径双语与新资产加载、6263fixture预算通过。完整日志均在 `output/fix-execution-20261008/t08-delivery-{ci,visual,static,perf}.log`；输出文件被gitignore排除，仅为本机证据。临时目录若不存在，按第5.3节重新冻结源码与创建fixtures；命令本身及新增正式测试随业务提交保留，不依赖聊天或旧临时文件。没有build/lint命令，也没有虚构它们。

### 12.3 剩余问题与未验证边界

- **A06/D05待确认**：没有生产有效nginx配置，不能确定verify是否继承开启，更不能把它当已确认攻击。需要获授权的有效verify/CA/name/depth配置及可信性证据；确认缺陷后另追加T23，或有继承证据时明确排除。T16故障mock不等于线上上游TLS验证。
- **A24/25/26已搁置**：本轮范围明确排除全面架构重写、完整资产备份产品和全面凭据/CSP/证据体系升级。T08只共享必要评分纯函数，T06只修任务lease，T07～11只修各自具体真实性/超时错误，不关闭这三项建议。
- **执行发现O01～03未纳入**：静态return-to-top时序间歇未有唯一根因；过期Provider目录刷新会覆盖custom endpoint；120任务保留上限可能淘汰running/queued记录。后两项有独立隔离证据，未在本轮偷偷修复；最后一次绿色不能排除它们。第8节“计划观察O01～04”是另一组历史记录，引用须注明“计划观察/执行发现”，保留编号不混淆。
- **未实测**：生产SSH/nginx/真实回滚、生产SQLite/IDB迁移、真实Provider/CORS/CSP与模型收益、Linux GitHub CI/Node24矩阵、低配设备与生产p95/p99、Excel。最低Node22.13.0及已装Chrome的本地行为已实际运行；WPS12.1.26046已验收T17原有公式样本，T08新增metadata列未再次由WPS打开，共用CSV转义回归已通过。Node SQLite仍有ExperimentalWarning。
- 测试从已装工具/官方隔离运行时执行，没有安装、推送或发布。T14准备期间一次假token GitHub/user请求的历史记录保留在E14；不宣称整个执行全程零外部请求，没有真实凭据/付费模型调用。原始报告及开工未跟踪资料保留，未混入业务提交。

**交付判断**：22项计划内代码修复具备本地验收与独立评审/隔离交付条件；原审26条去向完整。尚不能作“生产已部署、线上安全已全部验证、项目已无剩余问题”的结论。生产凭据链结论仍受A06证据缺口约束，范围外已证实问题需单独进入下一轮。


### 12.4 全部发现的最终追踪

| A | T/去向 | 当前结果 | 实際驗收與提交 |
|---|---|---|---|
| A-01 | T-01 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；4ffa944, c201acb |
| A-02 | T-02 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；e2dc7da, aa09cc4 |
| A-03 | T-03 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；2258387, 120e474 |
| A-04 | T-04 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；cbe21c0 |
| A-05 | T-05 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；429d634 |
| A-06 | 待确认；无T | 待确认 | 未取得生产有效 nginx 配置，可能继承已开启校验；不能当成已确认线上漏洞；保留第3/4/12.3节的证据缺口/范围依据 |
| A-07 | T-06 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；ff745cf, 874cf25 |
| A-08 | T-07 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；7a014ef |
| A-09 | T-08 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；ac0dc71；共享核心/实际存储、扫描、导出、镜像、策略/历史/UI已验收，见E29/E30 |
| A-10 | T-09 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；679ce71 |
| A-11 | T-10 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；d589256 |
| A-12 | T-11 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；65fa189 |
| A-13 | T-12 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；57bff3f |
| A-14 | T-13 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；38e3cfe |
| A-15 | T-14 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；aa13823 |
| A-16 | T-15 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；b4836bb |
| A-17 | T-16 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；8fc8298；29项shim，不是生产nginx演练 |
| A-18 | T-17 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；ae2d133；WPS双语言原生CSV样本另验，Excel未验 |
| A-19 | T-18 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；4173add；官方最低版dev/start/CLI实跑，Linux/24矩阵未跑 |
| A-20 | T-19 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；eaf8c3a |
| A-21 | T-20 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；d65fc0f |
| A-22 | T-21 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；ce56385 |
| A-23 | T-22 | 已完成 | `npm run ci`最终581/581；该T独立专项及未验证见第6/10节；e75bf1a |
| A-24 | 暂缓；无T | 已搁置 | 整体共享内核/UI 模块拆分是架构投入，超出缺陷修复。T-08 可共享必要纯函数，但不代表关闭 A-24；保留未来独立架构提案；保留第3/4/12.3节的证据缺口/范围依据 |
| A-25 | 暂缓；无T | 已搁置 | 完整工作区备份格式是新增产品能力，当前导出边界已披露；本轮仅为高风险修复准备隔离备份。T-06 的 lease 不等于实现完整恢复产品；保留第3/4/12.3节的证据缺口/范围依据 |
| A-26 | 暂缓；无T | 已搁置 | Keychain、凭据模型、全面 CSP/证据架构重做无已复现攻击，需单独产品/安全方案。T-07/T-09/T-10/T-11 只修各自具体缺陷，不能自动关闭此建议；保留第3/4/12.3节的证据缺口/范围依据 |

最终追踪命令：`python3 output/fix-execution-20261008/final-traceability-check.py`。结项时要求26个A唯一完整、22个T全部验收且各有T编号提交、原审逐字节不变、111源码SHA与最终门禁匹配、Git差异检查通过；结果保存为final-traceability-closed.json，不以提交存在单独证明验收。


结项核对已通过（2026-10-11）：T08独立提交 `ac0dc71f7d34092d927393d2c9b27d8e4d5e6003`；提交后 `npm run audit:secrets` 及工作区/暂存区diff检查PASS。`final-traceability-check.py`实际核对26个A完整唯一、22个T全部已完成且A→T一一对应、26个任务/补验提交、AUDIT_REPORT与开工备份逐字节一致、最终冻结111文件sourceDifferences=[]、CI/visual/static/perf实际退出码全0；结果final-traceability-closed.json。Git仅保留原未跟踪AUDIT_REPORT.md与FIX_PLAN.md，没有未提交业务改动。本轮授权范围执行已完成，A06与范围外/设计暂缓去向保持，不以结项目标自动扩展为生产操作。


## 13. 2026-10-11 部署与待确认项结项（当前交接）

本节覆盖第12节关于“未部署/A-06待确认”的历史状态。用户明确说“上线啊”，提供本机SSH密钥，随后要求“继续完成未完成的任务”；执行目标为既有主站 `https://starvault.deline.top/`。没有GitHub推送、Pages镜像发布、依赖安装、付费模型调用、旧releases删除或真实Node数据库迁移。A-24～26及范围外观察继续按原处置暂缓，未擅自扩展为架构/产品重建。

### 13.1 T-23：A-06 Exa 上游证书及名称校验

- **原始问题/严重度/证据**：A-06，原为条件性P1，现为已证实P1。真实 `sudo -n nginx -T` 显示全局http和StarVault server/location均未设置`proxy_ssl_verify`、可信CA、验证名称，仅设置SNI。nginx默认verify为off（官方参考：<https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ssl_verify>）。这是凭据转发链的身份校验缺口；未验证实际攻击，不声称有凭据泄漏。
- **定位**：`deploy/nginx/starvault.deline.top.conf` 的 `location = /api/exa/search`，以及生产 `/etc/nginx/conf.d/starvault.deline.top.conf` 对应location。
- **目标/范围**：只为此location显式开启verify，使用系统 `/etc/ssl/certs/ca-certificates.crt`，验证名`api.exa.ai`，verify_depth=2。保持请求路径、SNI、访客Key透传、CORS、方法白名单和限流。系统CA文件已查证可读，无安装。
- **优先级/工作量/风险**：P1／S／中。上游证书错误或不再受可信CA信任时将失败关闭而返回502，不能自动降级为不验证。
- **依赖/受影响**：D-05有效配置证据、T-16发布恢复及既有静态发布门禁；影响Exa代理可用性和依赖其搜索的浏览器流程，不改其他供应商/站点。
- **隔离/回滚**：在同一服务器既有nginx1.24.0上启动独立无特权进程，仅绑定随机127.0.0.1端口；使用独立临时prefix、PID、日志、假HTTPS上游/临时证书/虚假Key，不安装、不修改生产配置进行负向测试。真实发布前保存旧软链目标、旧首页、旧nginx配置，失败恢复二者；保留所有旧releases。未在生产制造错误证书，也未实际触发生产回滚。
- **客观验收**：①可信CA且名称正确的假上游POST200；②可信CA但错误名称502；③不可信自签证书502，错误日志分别有名称/链验证错误；④两种允许Origin预检204，外来Origin无allow头，GET405；⑤正式nginx -t通过，有效配置只新增4条TLS指令；⑥线上真实Exa虚假Key返回401/INVALID_API_KEY，HTTPS验证正常。全部通过。
- **可复现命令**：`ssh -i /Users/wilson/Downloads/secret.pem -o IdentitiesOnly=yes -o BatchMode=yes ubuntu@106.55.13.245 'python3 - /etc/nginx/conf.d/starvault.deline.top.conf' < deploy/verify-exa-proxy-tls.py`（仅新的独立loopback测试，不是重新部署）；`python3 output/deploy-20261011/live-http-check.py`（静态只读、预检及无效Key探针）；有效配置只读核对用`sudo -n nginx -T`，完整输出含其他站点配置，必须仅保存在权限600且已忽略的私有证据文件，不贴到公开仓库。
- **当前状态/验证记录**：已完成；`tls-fixture-result.json`三类证书场景通过；`nginx-effective-diff.txt`证实有效配置只增4条TLS指令，其他站点配置字节不变；`live-http-result.json`线上探针通过。证据目录均为`output/deploy-20261011/`。原始AUDIT_REPORT保持字节不变；当前A→T新增唯一关系为A-06→T-23。

### 13.2 真实发布结果与新增部署故障

- 前端源码仍为已验收的`ac0dc71f7d34092d927393d2c9b27d8e4d5e6003`；本轮只有nginx上述4行、部署脚本最终echo的变量边界修复及其回归测试新增，未修改public业务代码。3个跟踪文件的本轮补丁尚未提交/推送，部署内容以`release-manifest.json`及线上逐文件SHA为准，不能仅靠release目录里的commit短名推定配置完全等于Git提交。
- 新发布目录：`/var/www/starvault-imprint-deploy/releases/20261011105740-ac0dc71f7d34-27620`；旧目标：`/var/www/starvault-imprint-deploy/releases/20260917021600-d20b69d8bf44`。恢复资料：`/var/www/starvault-imprint-deploy/.restore-20261011105740-ac0dc71f7d34-27620`（root权限700）。本次设置`RELEASES_TO_KEEP=2147483647`，旧版本均未删除；本地暂存目录亦保留在部署日志所记路径。仅上传14个public静态文件及目标站点nginx配置，没有上传报告、数据、.env或SSH私钥。
- **DEP-01 / T-16补验**：正式部署已切换并通过首页/runtime/Exa探针后，macOS Bash3.2在`LC_ALL=C.UTF-8`下将紧接全角右括号的`$STATE_DIR）`误解析为更长变量，触发unbound variable，脚本退出非零。没有触发回滚，新站仍在线；不隐瞒该退出。定位脚本最后echo；改为`${STATE_DIR}）`，只修完成信息。新增实际`/bin/bash`的C/C.UTF-8回归，先红0/1再绿1/1；完整脚本故障矩阵最终30/30通过。旧测试fixture未携带UTF-8 locale，所以原29/29未覆盖这条分支。
- 无需为完成信息错误重复发布相同资产。独立线上核对确认软链、服务active、当前nginx配置SHA及14个产物字节正确；真实发布结果为成功，首轮脚本退出异常保留在`deploy.log`。
- 前置仍有效基线：官方Node22.13.0全CI581/581、visual60/0、static及性能fixture通过，源manifest与本轮变动比对确认public没有变化；本轮不声称重新跑过完整CI582项。新增配置由真实nginx证书矩阵验证；脚本仅echo边界变化，由30项完整部署专项及语法检查覆盖，最终凭据扫描/diff检查通过。

### 13.3 上线后验收与操作边界

- 线上14个静态文件逐字节等于本次stage，JS MIME正确，首页有精确release标记和备案信息、runtime为static且Exa路径为`/api/exa/search`；HTTPS请求使用正常证书校验，没有`-k`或ignoreHTTPSErrors。首页安全头、预检、外来Origin拒绝allow、方法405、无效Key401通过；`.env`、`.git/config`、`data/store.db`、两份内部报告访问为403/404。
- 新建隔离Chrome context验证1440/390×zh/en共4组：项目池、榜单、学习、结构看板、设置5个导航视图，真实项目点击详情及三个风险、笔记状态选择→保存→确认保存→刷新恢复，JSON/CSV导出和scoring metadata均通过；24张截图保存在`output/playwright/deploy-20261011/`，实际查看390英文项目与详情。页面错误/HTTP错误/被禁止外部请求均为0。所有读写仅属于测试新context，不操作用户正在使用的浏览器数据。
- native浏览器历史兼容：①v1 blob→v5的旧fixture；②使用旧生产release原始IndexedDB代码（其schema本来已是v5）写入fixture，再加载新站的修订v5持久化契约，两者都保留原笔记、旧分数、历史score snapshot、scan及board档案。第二轮初次日志误写v4标签已纠正后重跑，最终证据见`live-upgrade-production-version-final.log`和`live-upgrade-production-version-result.json`；不能将schema标签笔误或旧fixture结果当真实用户数据迁移证据。
- 浏览器验收工具的初次笔记断言取错snapshot层级，以及后续点在卡片tag、未完成状态选择/二次确认，属于测试步骤错误；日志全部保留。最终步骤明确点击仓库标题、状态watch及确认保存，等待真实saved record并逐次读取IDB验证，4/4通过；没有因测试错误修改业务代码或放宽验收。
- `deline.top`、`reader.deline.top`发布前后均HTTP200；nginx有效配置除上述4行字节一致。既有其他站点listen443协议选项警告发布前已存在，nginx -t始终通过，本轮没有扩修。
- 生产前端已上线，A-06证据缺口及T-23已结项。没有真实Key/付费模型成功请求、完整用户账户任务/真实生产容量测试、生产MITM或实际回滚；不宣称所有外部供应商/所有用户环境均已验证。Pages镜像及GitHub仍未推送/发布，原A-24～26和范围外产品决策/缺陷继续按原记录保留。
- 如需应急恢复，必须联合使用上面的`web.target`和`nginx.previous`，验证目标文件后切软链、恢复配置、nginx -t/reload、检查原首页和服务；不能只回退前端或只回退配置。代码回退不保证新浏览器数据可由旧代码安全读写，仍遵守第12节保存新版资料及独立验证的限制；本轮未执行实际恢复。


## 14. 2026-10-11 GitHub 同步与远端验收

用户明确要求“要更新”GitHub，授权将现有修复、部署补丁与两份独立审查/修复文档提交至既有公开仓库`HachikoJ/starvault-imprint`的`main`。此次不创建Release/PR，不改变仓库可见性、分支策略、LICENSE、提供方或部署目标。主站第13节的实际发布结果不因Git同步改变；GitHub Pages镜像按既有push工作流自动构建并发布。

- **提交范围与前置核验**：`git fetch origin`后远端未增加提交，本地在原远端main之上已有26个修复/补验提交。T-23配置及可独立运行的Linux loopback证书验证脚本已提交为`a4a0765`；T-16 UTF-8完成信息及回归测试提交为`95ddefa`。本文件与原始AUDIT_REPORT首次纳入版本追踪；原审字节保持不变。仅明确列名暂存，不纳入任何output、完整nginx配置、私钥、.env、用户数据库或真实凭据。
- **前置验证**：沿用最后已验收且未变化的前端/Node业务源码基线CI581/581、visual60/0、static和性能fixture；部署专项最终30/30及Bash语法通过。正式提交的`deploy/verify-exa-proxy-tls.py`在实际既有nginx1.24服务器独立临时prefix/loopback复跑，可信正确名称200、错误名称/不可信证书502、CORS/方法限制均通过；该脚本只读取候选配置，未更改生产配置/发出外部请求。前后凭据扫描及diff检查通过。
- **复现与证据携带边界**：仓库内源码、tests和可独立执行TLS验证器随提交携带；`output/`内首次失败、截图、完整/私有配置和日志作为本机证据保留且不上传。第10～13节的证据文件名表示实际运行记录，不意味着这些文件出现在GitHub；不拿仅有文档陈述替代远端运行结果。T-23复现命令已改用随仓库携带的验证器。
- **发布前状态（历史记录，最终结果见14.2）**：推送与GitHub远端工作流验收尚待执行。本次只在确认远端main包含准确HEAD、Linux CI各Node矩阵及visual结果、Pages发布和实际线上镜像资产/核心交互之后宣称远端同步与镜像发布完成。若出现远端失败，记录原因与修正，不把原本地通过当作远端已通过。


GitHub同步补记：第一轮推送`3c9043d`已成功，原始26个修复提交与T-23/T-16两个部署补丁、两份报告均在远端main。首次暂存diff检查对原审报告的Markdown两空格硬换行/原末尾空行报错，执行命令未因该格式退出而停止提交；该首次失败保留且不冒称通过。报告与开工备份仍逐字节相同。为同时保持原始审计证据及项目diff门禁，`.gitattributes`仅为`AUDIT_REPORT.md`设置`whitespace=-blank-at-eol,-blank-at-eof`，其他文件仍使用原检查；重新检查原基线至本次范围、工作区及暂存区。该规则不跳过代码测试/安全检查，不改审查结论或原文字节。随后推送此格式与记录补丁，以下远端验收以最终代码与规则提交对应run为准。


### 14.1 PUB-01：Pages 验收工具的初始引导时序

`e061f34`的Linux CI已完整通过：Node22.13.0/22/24各582/582、audit0 high漏洞、性能fixture通过，下载的visual artifact含60张截图及issueCount=0。Pages同SHA前两次attempt均在desktop返回顶部报scroll offset900、按钮未隐藏；首次及重跑日志保留，不能写成镜像已经发布。

针对性定位确认初始引导在`maybeShowInitialGuide`中延迟520ms弹出，`blockGuideTourBackgroundInteraction`按设计拦截引导卡片外的click。原`scripts/static-pages-check.js`在runtime/projects ready后直接操作背景返回顶部，可能与引导弹出重叠；测试其他语言时本来会关引导，返回顶部步骤却在其之前。真实Chrome四组1440/390×motion/no-motion验证：引导打开时背景Enter不滚动，Escape关闭后反复Enter及文档/列表同时偏移均正常。这是验收流程错误，不把预期modal阻止背景操作列为业务缺陷。

修正范围仅`bootPage`：等待初始引导状态明确，通过真实Escape关闭并等关闭完成，再检查工作区。没有注入guideSeen绕过引导，没有改返回顶部断言/8000ms门槛，没有自动多次重试以掩盖失败。新增`tests/browser-back-to-top.test.js`作为真实modal/keyboard回归；本地官方22.13回归1/1和static检查通过。此前探索过平滑滚动的独立DOM实验及一个public候选；它们不足以证明项目业务故障，候选已完全撤回。public全部文件SHA仍等于已经上线的产物，不需为验收工具修改重新部署主站。

该项是授权GitHub/Pages发布的必要验收工具修正，无新A编号、不扩展原23项业务修复任务；执行O01的这次失败已取得明确解释，但不能概括所有历史间歇现象均同根因。原始失败、Mac原业务用例通过及不成立的候选验证均保留在本机`output/github-sync-20261011/`。本次仅推送测试/脚本与记录，远端最终门禁仍待新的准确HEAD验证。


### 14.2 GitHub 与 Pages 最终验收（当前结果）

- **已验收代码提交**：`7f4503246dffb95362213c64c59d5415a975ec2d`，已推送既有仓库main。所有修复、部署补丁、原始审查报告和本计划均已进入GitHub；原始AUDIT_REPORT与开工备份逐字节相同，未上传私钥、用户数据、.env或output私有证据。
- **准确SHA的远端CI**：[CI run 38146718553](https://github.com/HachikoJ/starvault-imprint/actions/runs/38146718553)完整success。Linux Node22.13.0、22、24各583/583、fail0，包含PUB-01新增首次引导/键盘回归；各版本npm audit均0 vulnerabilities，凭据/离线计划/覆盖率与性能fixture门禁通过，visual job success；下载本次artifact实际核对60张PNG、issueCount=0、issues=[]。本机保存latest-ci-success.log、latest-ci-state.json与latest-visual-report.json。没有将旧SHA通过结果冒充本次结果。
- **准确SHA的Pages部署**：[Pages run 38146718552](https://github.com/HachikoJ/starvault-imprint/actions/runs/38146718552)build/deploy均success；CI及static验收均通过，先前两次Pages失败已由14.1的测试流程修正闭环。镜像为<https://hachikoj.github.io/starvault-imprint/>。
- **部署后实际验证**：HTTPS正常证书校验，14个静态文件逐字节匹配本地public；唯一预期内容注入为runtime-config.js中Exa代理绝对URL`https://starvault.deline.top/api/exa/search`，JS MIME正确。独立Chrome1440/390×zh/en四组5个导航页面、真实详情/3类风险、笔记状态选择→保存→确认→实际IDB→刷新恢复、JSON/CSV与评分metadata全部通过，页面/HTTP错误及额外外部请求均为0。24张截图保留并实际查看390英文项目及详情；证据pages-http-result.json、pages-browser-result.json和output/playwright/github-pages-20261011/。测试使用隔离context，没有真实Key、付费模型调用或访问用户浏览器数据。
- **主站影响**：public全部14文件源SHA仍与第13节已上线产物清单一致；PUB-01只改验收脚本/测试，故无需重新部署主站。主站<https://starvault.deline.top/>与Pages镜像均为同一已验收业务源码，运行时代理配置按各自部署入口设置。
- **文档结项提交规则**：本节仅更新FIX_PLAN.md，将已发生的远端验收写入交接记录；以`[skip ci]`提交避免为纯记录重复运行已通过的全部代码/部署门禁。该标记只用于此纯文档提交，不用于任何源码、测试、脚本或工作流修改。代码验收依据保持上面的7f45032，最终文档HEAD与该SHA之间必须仅有FIX_PLAN.md差异；同步后核对local HEAD=origin/main、ahead/behind=0、工作区干净及diff/secrets检查通过。最终SHA/核对回执保存在本机output/github-sync-20261011/final-sync-receipt.json（避免文档记录自身提交SHA产生循环）。
- **完整任务去向及限制**：原26个A保持唯一追踪，23条纳入修复且T-01～T-23全部完成，A-24～26仍按既有明确依据暂缓；未产生新的必修业务任务。没有创建PR/Release或改变可见性，没有实施真实Node数据库迁移、供应商付费请求、用户真实数据迁移或生产故障/回滚演练。第13节“尚未推送/Pages未发布”等表述为该阶段的历史状态，现由本节实际结果覆盖，不意味着那些未执行的高风险操作被自动授权或验证。
