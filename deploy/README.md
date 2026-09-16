# StarVault 静态部署

线上入口：<https://starvault.deline.top/>

- 腾讯云主机同时承载 `deline.top`、`reader.deline.top` 等其他站点，
  StarVault 使用独立的 nginx server block 和独立发布目录，互不影响。
- 只发布 `public/` 静态产物；服务器上不运行 Node 服务，不存放 `.env`、
  `data/`、`output/`、API Key 或任何本地数据。
- 发布目录为 `/var/www/starvault-imprint`，实际内容放在
  `/var/www/starvault-imprint-deploy/releases/<时间戳>-<commit>`，通过软链接切换，
  保留最近 5 个版本用于回滚。
- TLS 与 `deline.top` 共用 `/etc/nginx/ssl/deline.top/fullchain.pem`，
  该证书 SAN 已包含 `starvault.deline.top`。

## 发布

```bash
SSH_KEY=~/.ssh/starvault_deploy deploy/deploy-static.sh
```

脚本会检查静态产物、上传新版本、原子切换软链接、同步
`deploy/nginx/starvault.deline.top.conf`，最后执行 `nginx -t` 并重新加载。

## 回滚

```bash
ssh -i "$SSH_KEY" ubuntu@106.55.13.245 \
  'sudo ls -1 /var/www/starvault-imprint-deploy/releases'
sudo ln -sfn /var/www/starvault-imprint-deploy/releases/<版本> /var/www/starvault-imprint.next
sudo mv -Tf /var/www/starvault-imprint.next /var/www/starvault-imprint
```
