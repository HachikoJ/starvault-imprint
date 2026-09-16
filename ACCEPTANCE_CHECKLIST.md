# 星仓印记验收清单

更新日期：2026-09-16
使用方式：每次完成一个功能迭代后，按本清单做最小必要验收。

状态口径：

- `Pass`：源码、接口或命令可以证明当前能力已具备。
- `Verify`：能力已实现或基本具备，但需要浏览器视觉、真实 GitHub Token、真实 AI Key、长扫描或人工抽样验收。
- `Todo`：尚未完成，或缺少必要测试/生产化治理。
- `Fail`：当前状态明确不满足验收要求。
- `N/A`：当前阶段不适用。

本轮门禁基线：Git 初始提交 `bedb953`；Node 测试与语法检查由 `npm run ci` 执行；中英文 4 视口视觉矩阵由 `npm run visual:check` 执行；CI 使用 `npm run perf:storage:fixture` 运行不含用户数据的 6K 合成性能门禁，本机再用 `npm run perf:storage` 复验真实规模；密钥扫描由 `npm run audit:secrets` 覆盖工作树与全部 Git 提交。真实 GitHub 和 AI Provider 仍按 `Verify` 管理，不把本地密钥放入 CI。

## 1. 基础验证

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| A-001 | 项目可启动，首页可访问 | `npm run dev` 后打开 `http://localhost:4173` | Pass - 本地服务入口和静态首页存在，仍建议每次发布前启动验收。 |
| A-002 | 语法检查通过 | `npm run check` | Pass - 本轮已运行通过。 |
| A-003 | `.env`、本地数据和密钥文件不会被提交 | 检查 `.gitignore`、`git status --short` 和 Git 历史 | Pass - 已有 Git 基线；`.env`、`data/`、`output/` 等保持忽略，本轮提交前继续执行密钥扫描。 |
| A-004 | API 响应不直接返回未请求展示的密钥明文 | 调用 `/api/settings`，未带 `reveal` 时 Key 为空且有 preview | Pass - `settingsResponse()` 默认隐藏 GitHub/Tavily/Exa/AI Key。 |
| A-005 | 对外文档没有过时的功利化传播口径 | 使用旧口径词表扫描 README、PRD、Taxonomy、Risk 和 License 文档 | Pass - 对外主文档统一使用学习、理解、跟踪、实践启发和机会研判口径。 |
| A-006 | Node 主存储不再依赖整包项目 JSON | 运行 SQLite 测试并检查 `data/starvault.db` 表结构 | Pass - SQLite WAL 按项目、方案、扫描和归属关系增量持久化；设置、任务等小体量核心状态保留为 `app_state` JSON；旧 JSON 只读迁移。 |
| A-007 | Web IndexedDB 不再保存完整项目池与榜单整包 | 运行 IndexedDB/HTTP 集成测试 | Pass - IndexedDB v5 分对象仓库，项目、榜单和扫描临时结果记录级保存，Node 同步使用核心、项目分页和榜单分页。 |
| A-008 | 扫描、AI 分析、方案生成刷新后可恢复且不跨方案写入 | 运行 `tests/durable-tasks.test.js` 和浏览器本地任务测试 | Pass - 任务持久化；浏览器扫描按 profile 恢复，其他外部请求从中断处重试；进程重启重新排队，最多重试 3 次，并绑定创建时方案。 |

## 2. 设置与集成

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| S-001 | GitHub、Tavily、Exa、AI 配置集中在设置页 | 手动检查设置页布局 | Verify - 设置页入口和表单已存在，最终布局需浏览器确认。 |
| S-002 | 每个 Key 可独立显示、隐藏、清除和保存 | 分别操作 GitHub、Tavily、Exa、AI Key | Verify - 前端有独立 `secretVisibility` 和 `pendingSecretClears`，需手动走完整交互。 |
| S-003 | 清除 Key 后必须保存才生效，显示时不应恢复旧值 | 清除、保存、刷新页面、再次显示 | Verify - 代码按“标记清除后保存”处理，需浏览器回归。 |
| S-004 | Key 获取入口可点击到对应官方页面 | 检查链接；GitHub 指向 tokens classic | Pass - GitHub 指向 `https://github.com/settings/tokens?type=classic`，Tavily/Exa/AI 入口已配置。 |
| S-005 | AI Provider 使用通用 AI 表达，不在通用模块硬编码 DeepSeek 文案 | 中英文设置页和学习中枢检查 | Verify - 默认 provider 是 DeepSeek，但界面主体已偏通用 AI 表达；仍需全局文案抽查。 |
| S-006 | 拉取模型和测试连接有成功、失败、等待状态 | 使用有效和无效 Key 各测试一次 | Verify - `/api/provider-models` 和 `/api/provider-test` 已实现，需真实 Key 验收。 |
| S-007 | GitHub 测试成功后显示账号，测试按钮置灰或弱化 | 配置 GitHub Token 后测试连接 | Verify - `/api/github/me` 和账号面板已实现，需真实 Token 验收。 |

## 3. 扫描与数据入库

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| SC-001 | 手动扫描可触发，重复点击不会启动并发扫描 | 点击扫描并观察 `/api/scan/status` | Pass - `scanInProgress` guard 会返回 `already-running`。 |
| SC-002 | 扫描阶段展示清楚：准备、接口目录、GitHub、Tavily、Exa、评估、趋势缓存、完成 | 手动扫描观察顶部状态 | Verify - 阶段状态已在 `runScan()` 中设置，需浏览器观察文案与节奏。 |
| SC-003 | 扫描中展示动态图标、百分比和剩余耗时估计 | 手动扫描观察顶部状态 | Verify - API 有 percent/ETA 字段，UI 展示需人工确认。 |
| SC-004 | ETA 不应频繁大幅反复跳变；低置信阶段应有合理提示 | 长扫描观察 ETA 变化 | Verify - 已有平滑 ETA 和置信度，但需要真实长扫描验证。 |
| SC-005 | 扫描完成后只出现一次完成态，然后回到空闲态 | 手动扫描完成后观察状态切换 | Verify - 前端有完成态延迟复位，仍需手动复核是否重复显示。 |
| SC-006 | 扫描完成后项目池自动刷新，展示最新入库结果 | 扫描前后比较项目池数量和最近扫描时间 | Pass - 前端扫描完成后调用 `loadAll({ resetProjectPool: true })`。 |
| SC-007 | 趋势缓存随扫描更新，不在翻页或刷新页面时重新请求 GitHub | 翻页时观察网络请求和趋势状态 | Pass - 趋势只在扫描主链路更新，项目列表读取缓存。 |
| SC-008 | 扫描记录保存命中数、入库数、趋势更新数、错误列表 | 查看数据文件或 `/api/summary` | Pass - scan record 保存 received、insertedOrUpdated、trendUpdated、trendLimit、errors。 |
| SC-009 | 扫描开始前必须验证 GitHub Token；无效或缺失时立即停止 | 移除或替换为无效 Token 后扫描 | Pass - 扫描先验证 Token，失败后停止并引导至设置，不执行候选检索。 |

## 4. 项目池

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| P-001 | 顶部项目总数始终表示全量项目池，不随筛选变化 | 选择筛选条件后观察项目总数 | Pass - `summary()` 返回 `totalProjects` 和 `poolTotal`，数据层已区分。 |
| P-002 | 列表标题或分页区清楚展示当前命中数和当前页预览数 | 选择筛选条件后观察文案 | Verify - 数据有 `poolTotal/poolLimit`，UI 文案需人工确认。 |
| P-003 | 分页支持数字页码、上一页、下一页、页码跳转和单页条数选择 | 手动翻页、跳转、切换条数 | Verify - 前端分页状态和请求参数已实现，需浏览器验收。 |
| P-004 | 底部分页不遮挡项目列表文字，单页条数容器不截断 | 桌面宽度和窄屏检查 | Verify - 属视觉验收项，需截图矩阵确认。 |
| P-005 | 筛选条件顶部有清除全部筛选按钮；无筛选时置灰 | 添加和清除筛选 | Pass - `clearAllFilters` 按 active filters 置灰并重置。 |
| P-006 | 每组筛选模块都有统一的重置按钮 | 检查筛选侧栏 | Verify - 交互入口已存在，需视觉一致性检查。 |
| P-007 | 标签文字完整显示，不溢出容器，不出现散落标签 | 中英文、窄屏、长标签检查 | Verify - 需要视觉回归和人工抽查。 |
| P-008 | 语义筛选区清楚区分项目池全量标签、当前筛选后可选标签和当前命中标签 | 查看分组标题数字和悬停提示 | Verify - `semanticCatalog` 与 `semanticFilters` 已分离，表达是否清楚需人工确认。 |
| P-009 | 点击作者标签筛选当前项目池内该作者项目 | 点击作者标签后检查列表 | Pass - 项目标签筛选路径已接入 `applyProjectTagFilter()`。 |
| P-010 | 点击语言标签筛选当前项目池内该语言项目 | 点击语言标签后检查列表 | Pass - 语言标签会设置 `state.filters.language`。 |
| P-011 | 点击“解决什么、给谁用、可形成什么”标签后进行同类语义筛选，范围不过宽 | 点击多个语义标签并检查关联度 | Verify - 语义筛选和匹配规则已实现，关联度需抽样。 |
| P-012 | 切换精细标签后列表回到第一页 | 在第二页切换标签 | Pass - 筛选和标签点击会重置 `state.projectPool.page = 1` 或重新加载首屏。 |
| P-013 | 排序支持推荐、Star、更新时间、质量、趋势 Star、趋势 Fork | 切换排序并检查列表变化 | Pass - 存储层已支持 `stars`、`updated`、`quality`、`trendStars`、`trendForks`。 |
| P-014 | 项目卡片不外显低价值抽象标签，例如低摩擦许可、稳健 | 检查首页和榜单项目卡片 | Verify - 需浏览器抽查项目池和榜单卡片。 |
| P-015 | 项目简介用中文清楚表达项目用途，不能只是分类词 | 抽查纯英文项目和 AI/Agent 项目 | Verify - 中文简介生成逻辑已存在，质量需抽样。 |
| P-016 | Star/Fork 样式参考 GitHub：数量和操作按钮清楚分离 | 检查项目卡片和详情 | Verify - UI 已多轮调整，仍需视觉确认。 |
| P-017 | Star 后按钮变为 Unstar，Fork 后置灰并提示已 Fork | 使用 GitHub Token 实测 | Verify - API 与本地 action 状态存在，需真实 Token 验收。 |
| P-018 | 趋势标签显示前一日增量；缺失、失败、部分统计、0 增量状态文案清楚 | 抽查不同趋势状态项目 | Verify - 状态文案和缓存字段已实现，需真实扫描数据确认。 |
| P-019 | 趋势提示文字简洁，例如“前一日增量” | 悬停趋势标签 | Verify - 需浏览器悬停检查。 |

## 5. 项目详情

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| D-001 | 详情页重点清楚，不重复展示列表已有的中文名或语义标签 | 打开多个项目详情 | Verify - 布局属人工视觉验收。 |
| D-002 | 打开 GitHub、复制地址、收藏、Star、Fork 都有不遮挡操作的悬停提示 | 逐个悬停按钮 | Verify - Tooltip 系统已实现，需浏览器检查位置。 |
| D-003 | “打开 GitHub”按钮文字垂直和水平居中 | 检查详情操作区 | Verify - 视觉验收项。 |
| D-004 | AI 分析需求输入默认展开，并可折叠 | 打开详情页检查 AI 模块 | Verify - UI 入口已实现，需手动确认默认态。 |
| D-005 | AI 分析需求提示醒目：不填也可分析，填写后结合目标判断 | 检查提示颜色和文案 | Verify - 文案已存在，醒目程度需人工确认。 |
| D-006 | AI 分析结果是结构化渲染，不直接展示 Markdown 源文本 | 运行 AI 分析后检查结果 | Pass - LLM prompt 要求 JSON，前端 `renderAnalysisResult()` 结构化渲染。 |
| D-007 | AI 分析结果缓存，下次打开同项目直接展示 | 分析后刷新或切换项目再回来 | Pass - `storage.setAnalysis()` 写入 `store.analysis` 并回填项目。 |
| D-008 | 再次点击 AI 分析会更新结果 | 修改需求后重新分析 | Verify - runCount 与上下文保存已实现，需真实 AI Key 验收。 |
| D-009 | AI 分析内容精炼，重点覆盖风险、边界和实践思路 | 抽查分析结果 | Verify - prompt 已限制短句和四段结构，输出质量需抽样。 |
| D-010 | 更多数据两列展示且文字不截断 | 检查详情页更多数据 | Verify - 视觉验收项。 |
| D-011 | 我的研判记录支持新增、查看、更新和删除；有笔记项目在名称后有提示 | 写入和删除笔记 | Pass - `/api/note` 支持新增/更新/删除，列表有记录提示。 |
| D-012 | 详情页没有错误换行、遮挡、文字显示不全 | 中文和英文各抽查 5 个项目 | Verify - 需要视觉回归和人工抽查。 |

## 6. 榜单

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| L-001 | 支持日榜、周榜、月榜、总榜切换 | 点击榜单切换按钮 | Pass - API 和前端支持 `daily/weekly/monthly/all`。 |
| L-002 | 每个榜单默认展示 20 个项目 | 检查榜单数量 | Pass - `LEADERBOARD_LIMIT = 20`，API 默认 limit 为 20。 |
| L-003 | 日榜支持日期下拉归档 | 查看日期下拉和历史日期 | Pass - daily archive 已写入 `store.leaderboards.daily` 并提供 archives。 |
| L-004 | 榜单逻辑说明位于榜单头部下方，不挤占主体列表 | 检查榜单页布局 | Verify - 视觉验收项。 |
| L-005 | 榜单项目布局与项目池项目卡片风格一致 | 对比项目池和榜单 | Verify - UI 已调整，需截图确认一致性。 |
| L-006 | 点击榜单项目跳转到项目池并打开对应详情 | 点击榜单项目 | Pass - `openProjectDetailFromLeaderboard()` 会切换项目池并选择项目。 |
| L-007 | 榜单不把难解释的分数放在项目名后干扰阅读 | 检查项目标题行 | Verify - 需要浏览器确认当前展示位置。 |

## 7. 结构看板

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| B-001 | 结构看板只统计项目池数据，不统计外部或未入库项目 | 对比项目池总数和看板数据来源 | Pass - `summary()` 基于 `projectPool()` 结果计算分布。 |
| B-002 | 方向结构、语言分布、许可分布三列一行展示 | 检查布局 | Verify - 视觉验收项。 |
| B-003 | 功能标签地图单独一整行展示 | 检查布局 | Verify - 视觉验收项。 |
| B-004 | 功能标签表达用途和能力，不展示无意义泛标签 | 抽查标签地图 | Verify - 能力标签规则已实现，质量需抽样。 |
| B-005 | 标签地图没有重复标签 | 检查标签列表 | Pass - `renderTopicCloud()` 会按展示 label 合并去重。 |

## 8. 学习中枢

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| M-001 | 长期偏好和负向偏好横向对齐 | 检查学习中枢布局 | Verify - 视觉验收项。 |
| M-002 | 偏好画像、学习策略、近期行为都有固定展示区域，历史过长时内部滚动 | 造多条行为记录后检查 | Verify - UI 需造数据和浏览器检查。 |
| M-003 | 近期行为支持清除 1 小时、1 天、1 周、1 月、3 个月、全部 | 打开清除菜单 | Pass - 清除范围和 API 已实现。 |
| M-004 | 清除行为有防误操作确认 | 执行清除操作 | Pass - 前端 `clearMemoryEvents()` 有确认提示。 |
| M-005 | 清除近期行为会联动回滚由这些行为产生的偏好影响 | 清除前后比较偏好值 | Pass - `clearMemoryEvents()` 回滚事件权重，全部清除时回到手动基线。 |
| M-006 | 手动编辑偏好不因清除近期行为被误删 | 手动增强偏好后清除近期行为 | Pass - manual preferences 独立保存并作为基线保留。 |
| M-007 | 偏好值含义清楚，用户知道增强/减弱到什么程度 | 检查偏好编辑说明 | Verify - 文案和数值解释需人工确认。 |
| M-008 | 反信息茧房策略比例逻辑清楚，总体关系可理解且可调节 | 调整比例并观察说明 | Verify - 数据和 UI 已有，理解成本需人工验收。 |
| M-009 | 上下文压缩事件框和按钮不重叠 | 检查上下文压缩模块 | Verify - 视觉验收项。 |
| M-010 | 本地质量检查和 AI 调优说明清楚：点击后做什么、等待时怎样、完成后怎样 | 分别点击检查 | Verify - API 存在，交互说明需人工确认。 |
| M-011 | Harness 工程表达为项目自我评估和调优方法，而不是普通用户动作集合 | 检查文案和模块层级 | Verify - 文案已调整方向，仍需浏览器确认。 |
| M-012 | AI 调优失败时展示可理解错误，不破坏已有记忆 | 使用无效 AI Key 测试 | Verify - 错误路径存在，需无效 Key 验收。 |

## 9. 自进化 Taxonomy

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| T-001 | 语义标签由稳定核心标签和当前项目池动态标签共同构成 | 检查 `/api/summary` 或前端筛选标签 | Pass - `SEMANTIC_FILTER_CORE_KEYS` 与当前池统计共同生成。 |
| T-002 | 新扫描出现高频新机会类型时，系统能生成候选动态标签 | 使用包含新类型的测试项目池 | Verify - `emergingSemanticCandidates()` 已实现，需测试项目池验证。 |
| T-003 | 动态标签有去噪规则，不能把项目名、泛词或低价值词当标签 | 抽查动态标签 | Verify - 去噪规则存在，质量需抽样。 |
| T-004 | 标签排序结合项目数量、新增数量和记忆权重 | 对比扫描前后和偏好编辑前后排序 | Pass - 排序使用 `memoryWeight`、`count`、`newCount`。 |
| T-005 | 标签点击筛选逻辑与标签生成逻辑一致 | 点击动态标签并检查结果关联度 | Verify - 点击路径一致，语义关联度需抽样。 |
| T-006 | 标签名称不展示项目数，避免按钮过长 | 检查筛选按钮 | Pass - 数量在标题 badge/tooltip，按钮 label 不塞数量。 |

## 10. 导出

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| E-001 | 顶部只有一个导出入口，点击后选择 JSON 或 CSV | 手动检查顶部右侧 | Verify - 前端有统一 export menu，需浏览器确认。 |
| E-002 | 导出字段名跟随当前语言 | 中文和英文分别导出 | Pass - `exportFieldName()` 按 language 切换。 |
| E-003 | 导出不包含旧版用途字段或其他过时字段 | 检查 JSON/CSV header | Pass - `EXPORT_FIELDS` 不包含 `secondDevelopment`。 |
| E-004 | 导出包含中文项目名和中文简介 | 抽查导出内容 | Pass - 导出包含 `nameZh` 和 `descriptionZh`。 |
| E-005 | 导出包含趋势值和趋势状态 | 检查导出字段 | Pass - 导出包含 `trendStars`、`trendForks`、`trendDate`、`trendStatus`。 |
| E-006 | 导出内容尊重当前筛选结果 | 筛选后导出并比较数量 | Pass - 导出复用当前筛选参数并使用 `limit: all`。 |

## 11. 国际化与布局

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| I-001 | 中文界面无不必要中英混搭 | 手动检查主要 Tab | Verify - 需人工抽查。 |
| I-002 | 英文界面标题、副标题、统计卡、详情标签、学习中枢指标不发生非预期截断 | 切换英文并检查 | Pass - 自动矩阵已排除有意 ellipsis，并对其余文本裁切零容忍。 |
| I-003 | 顶部 Logo、Tab、配置状态、语言、导出、扫描在同一行且高度一致 | 检查顶部栏 | Verify - 视觉验收项。 |
| I-004 | 只有图标的按钮都有 Tooltip，且 Tooltip 在下方不遮挡相邻按钮 | 悬停所有图标按钮 | Pass - Tooltip 自动检查覆盖出界和目标遮挡。 |
| I-005 | 顶部已有文字的 Tab 不重复显示 Tooltip | 悬停顶部 Tab | Verify - 需浏览器确认。 |
| I-006 | 页面主体没有明显错位、遮挡、容器溢出 | 项目池、榜单、结构看板、学习中枢、设置页逐项检查 | Pass - 本轮 48 组页面/语言/视口截图通过自动布局检查。 |
| I-007 | 窄屏下标签、按钮和统计卡仍完整可读 | 使用浏览器模拟窄宽度 | Pass - 390px 项目池、榜单操作行和标题状态已专项修复并复测。 |

## 12. 系统视觉回归

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| V-001 | 视觉回归矩阵覆盖中文、英文和 4 个固定视口 | 查看 [VISUAL_REGRESSION.md](VISUAL_REGRESSION.md) | Pass - 文档和脚本矩阵已覆盖中英文、4 视口、主要页面。 |
| V-002 | 项目池、榜单、学习中枢、结构看板、我的仓库、设置页都有截图 | 运行 `npm run visual:check` 后检查 `output/visual-regression/screenshots/` | Pass - 中文/英文、desktop/laptop/tablet/mobile、6 个主视图均生成截图。 |
| V-003 | 自动检查能捕捉横向溢出、文字裁切、同级遮挡、Tooltip 出界和控制台错误 | 运行 `npm run visual:check` 并查看 `report.json` | Pass - 自动报告覆盖上述类别；有意 ellipsis 和 line-clamp 不作为失败。 |
| V-004 | 英文状态下品牌副标题、项目池统计、详情标签、学习中枢指标和设置表单不溢出 | 查看英文截图和自动报告 | Pass - 本轮报告无未解释英文裁切。 |
| V-005 | 每次较大 UI 改动后必须保留一轮视觉回归结果 | GitHub Actions artifact 或本地输出 | Pass - CI 独立安装 Chromium、执行矩阵并保留 7 天 artifact。 |

## 13. 我的仓库

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| G-001 | 我的仓库是独立 Tab，GitHub 配置仍在设置页 | 检查导航和设置页 | Pass - `#view-github` 独立存在，配置仍在 settings。 |
| G-002 | 未刷新前不自动拉取仓库 | 打开我的仓库页观察网络请求 | Pass - 仓库读取只在 `loadGithubRepos()` 触发。 |
| G-003 | 点击刷新仓库后展示用户仓库 | 配置 GitHub 后点击刷新 | Verify - API 已实现，需真实 Token 验收。 |
| G-004 | 仓库操作状态与项目池 GitHub 操作状态一致 | Star/Fork 后切换页面检查 | Verify - 本地 action 状态共享，需真实操作验收。 |

## 14. 发布阻断项

以下任一项失败时，不应视为可发布：

- 密钥泄露到页面、API 默认响应、日志或导出文件。
- 许可边界文案误导用户认为公开仓库等于可任意复制、修改或分发。
- 扫描无法完成，或失败后没有可理解错误。
- 项目池筛选、分页或详情无法使用。
- 视觉回归矩阵未跑，或存在未解释的遮挡、错位、英文溢出、标签超框问题。
- 文档或 UI 出现过时的功利化传播口径。
- AI 分析结果覆盖仓库事实或忽略用户需求。
- 学习记忆不可查看、不可编辑或清除行为后偏好无法解释。
- 项目没有 Git 版本基线，导致变更无法追踪和回滚。
- 默认方案出现只属于其他方案的项目，或任务结果写入错误方案。
- Web 同步退回完整项目池/榜单 JSON，或 SQLite 写入退回每次重写整库文件。
- 长任务只显示刷新警告而没有持久化任务记录和恢复路径，或扫描 profile 检查点未能恢复。
- 非本机 Node 服务在没有认证网关、TLS 和边缘防护时直接公开。
- `npm run ci` 或 `npm run visual:check` 未通过。
- 静态在线版把用户 Key、本地扫描结果或行为记录写入随站点发布的文件，或示例快照包含凭据字段。
- 静态在线版在访客已有项目、方案、收藏、笔记或 Key 时覆盖其数据。

## 15. 建议验证顺序

1. 运行 `npm run ci`。
2. 运行 `npm run visual:check`，检查自动报告和关键截图。
3. 在接近真实规模的数据上运行 `npm run perf:storage`。
4. 检查 `git status --short`、ignored 文件和密钥模式扫描。
5. 启动 `npm run dev`，检查顶部布局和配置状态。
6. 用有效和无效 GitHub Token 分别验证保存、测试、扫描阻断和完整扫描。
7. 用真实 AI Key 验证模型拉取、连接测试、项目分析和方案生成。
8. 先运行 `npm run audit:plans:offline`，再使用陌生领域 cases 文件运行 `npm run audit:plans:live -- --cases-file <file>`。
9. 项目池执行搜索、标签、排序、分页、收藏、隐藏和导出。
10. 打开详情执行 Star、Unstar、Fork、研判、AI 分析与更多数据检查。
11. 查看榜单、结构看板、学习中枢和我的仓库，并切换英文复核。
12. 公网部署时单独验收 TLS、认证网关、CDN/WAF、Secret Manager、审计和恢复演练。

## 16. 静态在线体验（GitHub Pages）

| ID | 验收项 | 检查方式 | 状态 |
|---|---|---|---|
| D-001 | 空浏览器首次打开即可看到示例方案、项目池、扫描记录和榜单 | 清空站点数据后打开静态版 | Pass - `tests/local-api.test.js` 覆盖空库首次装载：`demo-content` 方案、25 个真实公开仓库、1 条完成扫描和 1 份日榜归档。 |
| D-002 | 刷新不会重复装载或覆盖已有数据 | 刷新页面；再在已有项目、方案、收藏、笔记或 Key 的浏览器打开 | Pass - 种子标记与阻断检查覆盖 secrets、projects、scans、tasks、leaderboards、plans、user-data、memory。 |
| D-003 | 示例快照不含任何凭据字段 | 检查 `public/demo-snapshot.json` 与快照校验逻辑 | Pass - 快照 schema 校验会拒绝含凭据字段的文件，测试遍历全部键名比对凭据模式。 |
| D-004 | 静态站可在无后端、无 Key 的情况下加载并导航 | `npm run check:static` | Pass - Chromium 直接访问静态服务器，无后端和 Key 时加载 25 个项目、方案、扫描与榜单；桌面和移动端均无 console、网络错误或水平溢出。 |
| D-005 | Pages 子路径（`/<repo>/`）下资源与示例快照都能解析 | `npm run check:static` | Pass - 验收服务器使用 `/starvault-imprint/` 子路径，并逐项确认 HTML、运行时脚本、示例快照、OG 图和 favicon 返回 200。 |
| D-006 | 静态版不承担账号、租户隔离与密钥托管 | 阅读 README、SECURITY 与页面说明 | Pass - 文档明确静态版无账号、无租户隔离，Key 只留在访客浏览器 IndexedDB。 |
| D-007 | Git 历史与工作树都不含密钥或本地数据 | `npm run audit:secrets` | Pass - 同时扫描工作树与全部提交 patch，测试覆盖仅存在于历史的 Token、`data/`、`output/` 与本地快照。 |
| D-008 | 真实 Pages 地址可访问且部署产物与本地验收一致 | 部署后打开 `https://hachikoj.github.io/starvault-imprint/` | Pass - 2026-09-16 Actions 发布成功（run `35078067145`）；线上页面返回 200，桌面和移动端全新浏览器均装载 `demo-content`、25 个项目、20 条榜单和 1 条扫描，横向溢出、console、失败请求与 HTTP 错误均为 0。 |
| D-009 | 长页面提供可用、键盘可达的返回顶部按钮 | `npm run check:static` | Pass - 桌面与移动端滚动项目池后按钮出现，标签为“返回顶部”，可聚焦并用键盘触发，触发后滚动偏移归零且按钮自动隐藏。 |
