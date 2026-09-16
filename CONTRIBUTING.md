# Contributing

感谢你对星仓印记的关注。提交 Issue 或 Pull Request 前，请先确认改动仍然遵守项目的
[安全边界](SECURITY.md) 和[源码许可](LICENSE)。

## 适合提交的内容

- 可复现的缺陷、文档错误和兼容性问题。
- 不扩大账号、权限或隐私范围的测试、可访问性和质量改进。
- 与现有产品方向一致，并能解释用户价值和验证方式的功能提案。

商业使用、SaaS 托管、白标、付费交付和未获授权的集成不在贡献范围内。

## 开发环境

- Node.js 22.8.0 或更高版本（`node --test` 覆盖率阈值参数从该版本开始可用）。
- npm，使用仓库中的 `package-lock.json` 安装依赖。
- Chromium。Playwright 相关检查会使用本机浏览器或下载的 Chromium。

```bash
npm ci
npm run dev
```

默认本地地址是 `http://127.0.0.1:4173`。不要提交 `.env`、`data/`、`output/`、
密钥、Token、用户数据、账号二维码或本地扫描快照。

## 提交前检查

```bash
npm run check
npm test
npm run audit:secrets
npm run audit:plans:offline
git diff --check
```

涉及界面、静态部署或长页面时，再运行：

```bash
npm run visual:check
npm run check:static
```

涉及存储或大项目池时，运行：

```bash
npm run perf:storage:fixture
```

## Pull Request

1. 从最新 `main` 创建主题分支。
2. 保持改动范围单一，说明用户可观察的变化和风险。
3. 补充或更新相关测试、文档和验收证据。
4. 在 PR 中列出实际运行的命令与结果。
5. 确认没有密钥、真实用户数据、临时输出或调试代码。

安全问题不要公开提交 Issue，请按 [SECURITY.md](SECURITY.md) 的流程报告。
