# Security Policy

更新日期：2026-09-16

星仓印记是本地优先、单用户产品。安全设计区分两种运行方式：

- Web 静态模式：业务数据与密钥保存在当前浏览器的 IndexedDB，不需要星仓服务端收集用户数据。
- Node 本地服务：默认只监听 `127.0.0.1`，业务数据和密钥保存在本机 SQLite。

## 支持边界

- 推荐：个人电脑、本机应用、可信内网，或只发布 Web 静态模式（含 GitHub Pages 在线体验）。
- 有条件支持：Node 服务位于 TLS 反向代理、认证网关、CDN/WAF 和外部 Secret Manager 之后。
- 不支持：把 Node 监听端口直接暴露到公网，或把它当作具备账号体系和租户隔离的 SaaS 后端。

### 静态在线体验版的边界

- 站点上不运行星仓印记服务端，没有账号、登录、会话、配额或租户隔离；每个访客的工作区只存在于自己的浏览器 IndexedDB。
- 访客自己填写的 GitHub Token、Tavily Key、Exa Key 和 AI Key 只写入该浏览器的 IndexedDB，不上传、不汇总、不进入仓库。GitHub、Tavily 和 AI 请求由浏览器直接发往对应服务商；Exa 只放行自家控制台和 localhost 的跨域来源，因此在线站点改走同源代理 `/api/exa/search`，服务器只透传该请求、不落盘也不记录 Key。
- `public/demo-snapshot.json` 是唯一随站点发布的业务数据，只包含真实 GitHub 公开仓库元数据；构建脚本会拒绝含凭据字段的快照，自动化测试会校验快照 schema、项目数量和凭据字段。
- 示例数据只在空工作区首次读取时写入；检测到已有项目、方案、收藏、笔记、扫描记录、榜单、任务或 Key 时跳过，不会覆盖访客数据。
- 任何人都可以打开前端源码、修改本地数据或重放请求。这意味着静态版不能承载“只有登录用户才能看到”的内容，也不应被用来托管私密数据。

## 本地数据与隐私

- 不得提交 `.env`、`data/`、`output/`、`.agents/`、`.playwright-cli/`、二维码、私有截图或本地扫描快照。
- Node 运行时主库是 `data/starvault.db`。旧 `data/store.json` 只作为首次迁移来源和人工备份，仍可能包含历史密钥与用户数据；服务配置即使收到 `.json` 路径也默认迁移到同名 SQLite，只有显式 `ALLOW_LEGACY_JSON_STORE=1` 才保留旧整包模式。
- Web 静态模式的 GitHub、Tavily、Exa 和 AI Key 以独立记录保存在 IndexedDB；Node 模式保存在 SQLite。两者当前都是本机明文静态数据，不是加密密钥库。
- portable export、核心快照、项目分页和榜单分页均排除 GitHub Token、Tavily Key、Exa Key 和 AI Provider Key。
- `/api/settings?reveal=...` 只在用户主动显示某个密钥时返回对应值。不要在不可信浏览器、共享机器或公网裸服务上使用该能力。
- AI 分析和方案生成会把用户输入及必要仓库上下文发送给配置的 AI Provider；GitHub、Tavily 和 Exa 也会按请求接收相应元数据。
- GitHub Star、Unstar 和 Fork 会修改已配置 Token 对应的 GitHub 账号状态。

## 已实现的应用层保护

- 非 loopback 的 `HOST` 绑定必须配置 `AUTH_TOKEN`，否则服务拒绝启动。
- 鉴权只读取 Authorization Header 或受控 Cookie，不接受可能泄露到日志和历史记录的查询参数 Token。
- Origin 比较包含 scheme、host 和 port；可通过 `PUBLIC_ORIGIN` 显式配置反向代理后的公开源。
- `TRUST_PROXY` 默认关闭，只有明确启用后才信任转发客户端地址。
- 浏览器写请求执行同源、Fetch Metadata 和 JSON Content-Type 检查。
- GitHub、AI Provider 和外部 URL 使用 allow-list、HTTPS、凭据禁止和私网地址拦截，降低 SSRF 风险；私网 Provider 只能显式开启。
- 对普通 API、写操作、扫描、AI 重任务、静态资源、鉴权失败和扫描器 User-Agent 分级限流。
- 限制 URL、查询参数、Header、JSON Body、对象深度和键数量，并丢弃 `__proto__`、`prototype`、`constructor` 等原型污染键。
- 静态文件经过 realpath 校验，阻止目录穿越，并显式拦截 `.env`、`.git`、`src/`、`data/`、`node_modules/` 和 source map 探测。
- 响应包含 CSP、`nosniff`、frame blocking、referrer policy、permissions policy、noindex 和请求超时边界。
- 扫描、AI 分析和方案生成由有界并发队列执行，最大并发为 2，持久化任务最多重试 3 次；浏览器扫描的已完成 profile 结果暂存于独立 IndexedDB 对象仓库并在任务结束后清理。
- 持久化任务不写入 API Key 或 Token，任务结果绑定创建时的观察方案，避免跨方案写入。

## 这些保护做不到什么

- 浏览器开发者工具无法可靠禁用；发送到浏览器的 JavaScript、CSS 和数据都应视为用户可读取、修改和重放。
- 动态加载脚本只能略微增加机械抓取成本，不能保护公开前端源码，也不能替代许可证追责。
- 应用层限流不能抵御大流量 DDoS、源站带宽耗尽、僵尸网络或高级 Bot；这些必须在 CDN/WAF/云边缘处理。
- `AUTH_TOKEN` 是单实例共享访问令牌，不是用户账号、RBAC、会话治理或租户隔离。
- 本地明文密钥无法抵御设备入侵、恶意浏览器扩展、同源 XSS 或具有本机文件权限的进程。
- AI 输出、外部搜索结果和自动许可判断都不是法律或事实保证，关键决策必须回看仓库与许可证原文。

## 公网部署最低要求

1. 只允许 HTTPS，Node 源站不可直接暴露。
2. 在反向代理或身份网关实施强认证、会话过期、暴力破解防护和细粒度访问策略。
3. 使用 CDN/WAF 提供 DDoS、Bot 管理、IP reputation、速率限制和请求体边界。
4. 使用 Secret Manager 或平台密钥服务，不把生产密钥保存在应用 SQLite 或浏览器 IndexedDB。
5. 开启结构化审计日志、告警、备份、恢复演练和密钥轮换。
6. 单独评审所有可显示密钥、触发扫描、调用 AI 或修改 GitHub 账号状态的 API。
7. 若引入多用户，必须重新设计身份、授权、数据隔离、配额和删除导出流程，不能沿用当前单用户模型。

## 发布检查

```bash
npm run ci
npm run visual:check
npm run perf:storage
npm run audit:secrets
git status --short
git status --ignored --short
```

`npm run audit:secrets` 会扫描工作树与全部 Git 提交和 patch，覆盖 `.env`、`data/`、`output/`、旧本地快照和 GitHub/Tavily/Exa/AI 凭据痕迹；发布前仍应人工确认 `.env`、`data/`、`output/` 和任何用户数据没有进入 Git。

## 漏洞报告

请通过 [GitHub Issues](https://github.com/HachikoJ/starvault-imprint/issues) 报告安全问题，或发送邮件到 `946106011@qq.com`。报告中不要附带真实 Token、Key 或其他用户的敏感数据；涉及可利用细节的漏洞请先用邮件私下联系，不要直接公开复现步骤。
