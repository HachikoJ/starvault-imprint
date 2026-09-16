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
`deploy/nginx/starvault.deline.top.conf`，最后执行 `nginx -t` 并重新加载，
再用无效 Key 探针确认 Exa 代理返回 Exa 的真实 401。

## Exa 代理

Exa 的浏览器跨域白名单只放行它自己的控制台和 `localhost`，纯静态页面直连
`api.exa.ai` 必然被浏览器拦截。因此 nginx 只开放一个转发端点：

```text
POST /api/exa/search -> https://api.exa.ai/search
```

- 发布脚本把 `EXA_PROXY_PATH`（默认 `/api/exa/search`）注入线上的
  `runtime-config.js`，前端只认这个地址；仓库里的默认值为空，只在本机直连时成立。
- GitHub Pages 镜像没有后端，`pages.yml` 在发布前把代理指向主站
  `https://starvault.deline.top/api/exa/search`；跨域来源仅回显自有站点的
  `Origin`，其他来源拿不到 `Access-Control-Allow-Origin`。
- Key 由访客浏览器放在 `x-api-key` 中透传，服务器不保存、不记录；端点按 IP 限流，
  POST 之外的请求一律拒绝。

## 属地合规信息

备案号这类只和部署所在地有关的文本不进入仓库。发布前把备案号写成单行文本放进
未跟踪文件 `deploy/filing.local`，或用环境变量覆盖：

```bash
ICP_NUMBER="粤ICP备XXXXXXXX号-X" deploy/deploy-static.sh
```

脚本在本地暂存目录里把该文本注入页脚的
`<!-- deployment:extra-footer-link -->` 位置，服务器收到的产物带备案信息，仓库源码和
GitHub Pages 镜像都不包含。未提供时脚本会打印提示并照常发布。

## 回滚

```bash
ssh -i "$SSH_KEY" ubuntu@106.55.13.245 \
  'sudo ls -1 /var/www/starvault-imprint-deploy/releases'
sudo ln -sfn /var/www/starvault-imprint-deploy/releases/<版本> /var/www/starvault-imprint.next
sudo mv -Tf /var/www/starvault-imprint.next /var/www/starvault-imprint
```
