# Changelog

本项目的重要变化记录在这里。版本格式遵循 [Semantic Versioning](https://semver.org/)。

## [0.1.0] - 2026-09-16

### Added

- 无账号、无 Key 即可体验的 GitHub Pages 静态在线版。
- 基于真实 GitHub 公开元数据的 25 个示例项目和 10 个领域 profile。
- IndexedDB v5 本地存储、示例数据首次装载、长任务恢复与 GitHub 风控冷却。
- 方案生成质量审计、密钥审计、视觉回归、静态部署检查和 6K 存储性能门禁。
- GitHub Secret Scanning 和 Push Protection 发布边界。
- 长页面返回顶部按钮，桌面与移动端均支持鼠标点击和键盘触发。
- 站点页脚的官网、GitHub 仓库与 ICP 备案入口，桌面常驻、移动端随页面到底。

### Changed

- Node 服务保持本机单用户模式，静态页面直接使用 IndexedDB，不探测不存在的后端。
- CI 和 Pages 工作流统一使用受支持的 Node 22 运行时，最低版本提升到 Node 22.8.0。

### Security

- `public/demo-snapshot.json` 仅包含公开仓库元数据，不包含凭据或用户行为数据。
- 工作树和 Git 历史由 `npm run audit:secrets` 持续检查；任何真实 Key 都应只保留在用户自己的
  本地 SQLite 或浏览器 IndexedDB 中。
