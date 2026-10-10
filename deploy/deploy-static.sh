#!/usr/bin/env bash
# 把仓库里的 public/ 静态产物发布到腾讯云主机，并让 starvault.deline.top
# 指向新版本。发布采用 releases + 软链接：上传完成前不会切换线上目录，
# 切换后的检查失败会恢复原静态目标和 nginx 配置；真实部署仍须单独授权。
#
# 用法：
#   SSH_KEY=~/.ssh/starvault_deploy deploy/deploy-static.sh
#
# 属地合规信息（如备案号）不进入仓库：设置 ICP_NUMBER 或写入未跟踪文件
# deploy/filing.local，发布时会注入到线上页脚的 deployment:extra-footer-link 位置。
#
# Exa 无法从静态页直连（其跨域白名单只放行自家控制台和 localhost），因此发布时
# 往 public/runtime-config.js 注入同源代理地址，由 nginx 转发到 api.exa.ai。

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$REPO_ROOT/public"
NGINX_CONF="$REPO_ROOT/deploy/nginx/starvault.deline.top.conf"
FILING_FILE="${FILING_FILE:-$REPO_ROOT/deploy/filing.local}"
FOOTER_FILING_SLOT="<!-- deployment:extra-footer-link -->"

HOST="${HOST:-ubuntu@106.55.13.245}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/starvault_deploy}"
DOMAIN="${DOMAIN:-starvault.deline.top}"
WEB_ROOT="${WEB_ROOT:-/var/www/starvault-imprint}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/starvault-imprint-deploy}"
NGINX_TARGET="${NGINX_TARGET:-/etc/nginx/conf.d/starvault.deline.top.conf}"
RELEASES_TO_KEEP="${RELEASES_TO_KEEP:-5}"
EXA_PROXY_PATH="${EXA_PROXY_PATH:-/api/exa/search}"

SSH_OPTS=(-i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes)
RSYNC_SSH="ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes"
RSYNC_PATH="sudo rsync"

fail() {
  echo "部署失败：$1" >&2
  exit 1
}

[[ "$RELEASES_TO_KEEP" =~ ^[1-9][0-9]*$ ]] || fail "RELEASES_TO_KEEP 必须是正整数"

[[ -f "$PUBLIC_DIR/index.html" ]] || fail "缺少 public/index.html"
[[ -f "$PUBLIC_DIR/demo-snapshot.json" ]] || fail "缺少 public/demo-snapshot.json"
[[ -f "$SSH_KEY" ]] || fail "找不到 SSH 私钥 $SSH_KEY，可用 SSH_KEY=... 指定"
[[ -f "$NGINX_CONF" ]] || fail "缺少 nginx 配置 $NGINX_CONF"

grep -q '"static"' "$PUBLIC_DIR/runtime-config.js" || fail "runtime-config.js 未指向 static 模式"
[[ "$EXA_PROXY_PATH" == /* || "$EXA_PROXY_PATH" == https://* ]] || fail "EXA_PROXY_PATH 必须是同源路径或 https 地址：$EXA_PROXY_PATH"
if find "$PUBLIC_DIR" -name '.DS_Store' -print -quit | grep -q .; then
  fail "public/ 中存在 .DS_Store，请先清理"
fi

STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/starvault-imprint-deploy.XXXXXX")"
cleanup() { rm -rf "$STAGE_DIR"; }
trap cleanup EXIT

rsync -a --delete --exclude '.DS_Store' "$PUBLIC_DIR/" "$STAGE_DIR/"

node "$REPO_ROOT/scripts/inject-runtime-config.js" "$STAGE_DIR/runtime-config.js" "$EXA_PROXY_PATH" || fail "Exa 代理注入失败"

FILING_TEXT="${ICP_NUMBER:-}"
if [[ -z "$FILING_TEXT" && -f "$FILING_FILE" ]]; then
  FILING_TEXT="$(tr -d '\r\n' < "$FILING_FILE")"
fi

if [[ -n "$FILING_TEXT" ]]; then
  [[ "$FILING_TEXT" != *[[:space:]]* && "$FILING_TEXT" == *ICP* ]] || fail "备案号格式不正确，应为单行文本且包含 ICP：$FILING_TEXT"
  grep -qF "$FOOTER_FILING_SLOT" "$STAGE_DIR/index.html" || fail "public/index.html 缺少 $FOOTER_FILING_SLOT 注入点"
  FILING_ANCHOR="            <a href=\"https://beian.miit.gov.cn/\" target=\"_blank\" rel=\"noopener noreferrer\">$FILING_TEXT</a>"
  awk -v anchor="$FILING_ANCHOR" -v slot="$FOOTER_FILING_SLOT" '
    index($0, slot) { print anchor; next }
    { print }
  ' "$STAGE_DIR/index.html" > "$STAGE_DIR/index.html.staged"
  mv "$STAGE_DIR/index.html.staged" "$STAGE_DIR/index.html"
  grep -qF "$FILING_TEXT" "$STAGE_DIR/index.html" || fail "备案信息注入失败"
  echo "已注入服务器端备案信息"
else
  echo "提示：未设置 ICP_NUMBER 且不存在 $FILING_FILE，本次发布不含备案信息"
fi

COMMIT_SHA="$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD 2>/dev/null || echo nogit)"
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-$COMMIT_SHA-$$"
RELEASES_DIR="$DEPLOY_ROOT/releases"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
NEXT_LINK="$WEB_ROOT.next-$$"
STATE_DIR="$DEPLOY_ROOT/.restore-$RELEASE_ID"
REMOTE_CONF="$STATE_DIR/nginx.candidate"
DEPLOY_ACTIVE=0
DEPLOY_ACCEPTED=0
PREVIOUS_PAGE_HASH=""

# 恢复资料每次独立，不复用固定 /tmp/*.prev；保留现场供人工诊断。
rollback() {
  local original_status="$1" rollback_status=0 restored_page="" restored_hash=""
  trap - ERR
  set +e
  echo "部署失败（退出 $original_status），开始恢复静态目标和 nginx 配置" >&2
  ssh "${SSH_OPTS[@]}" "$HOST" "set +e
    failed=0
    if sudo -n test -f '$STATE_DIR/web.target'; then
      previous=\$(sudo -n cat '$STATE_DIR/web.target')
      sudo -n ln -sfn \"\$previous\" '$NEXT_LINK' && sudo -n mv -Tf '$NEXT_LINK' '$WEB_ROOT' || failed=1
      [[ \$(readlink '$WEB_ROOT') == \"\$previous\" ]] || failed=1
      if sudo -n test -f '$STATE_DIR/index.previous'; then
        sudo -n cmp -s '$STATE_DIR/index.previous' '$WEB_ROOT/index.html' || failed=1
      fi
    else
      sudo -n rm -f -- '$WEB_ROOT' || failed=1
      [[ ! -e '$WEB_ROOT' && ! -L '$WEB_ROOT' ]] || failed=1
    fi
    if sudo -n test -f '$STATE_DIR/nginx.previous'; then
      sudo -n install -m 644 -o root -g root '$STATE_DIR/nginx.previous' '$NGINX_TARGET' || failed=1
      sudo -n cmp -s '$STATE_DIR/nginx.previous' '$NGINX_TARGET' || failed=1
    else
      sudo -n rm -f -- '$NGINX_TARGET' || failed=1
      [[ ! -e '$NGINX_TARGET' ]] || failed=1
    fi
    sudo -n nginx -t || failed=1
    sudo -n systemctl reload nginx || failed=1
    exit \"\$failed\"
  " || rollback_status=1
  if [[ -n "$PREVIOUS_PAGE_HASH" ]]; then
    restored_page="$(curl -fsS --max-time 20 "https://$DOMAIN/")" || rollback_status=1
    restored_hash="$(printf '%s' "$restored_page" | node -e 'const fs = require("node:fs"), crypto = require("node:crypto"); process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(0)).digest("hex"));')"
    [[ "$restored_hash" == "$PREVIOUS_PAGE_HASH" ]] || rollback_status=1
  fi
  if [[ "$rollback_status" == 0 ]]; then
    echo "已恢复发布前的静态目标和 nginx 配置（首次发布恢复原先不存在的状态）" >&2
  else
    echo "回滚失败：不能确认旧版本已恢复；恢复资料保留在 $STATE_DIR" >&2
  fi
  exit "$original_status"
}

on_error() {
  local status="$?"
  if [[ "$DEPLOY_ACTIVE" == 1 && "$DEPLOY_ACCEPTED" == 0 ]]; then rollback "$status"; fi
  if [[ "$DEPLOY_ACCEPTED" == 1 ]]; then
    echo "发布验收已通过，但旧版本清理失败；线上仍为新版本，恢复资料保留在 $STATE_DIR" >&2
  fi
  exit "$status"
}
trap on_error ERR

# 用发布标记验首页确实来自本次 release，而不只接受任意 HTTP 200。
printf '\n<!-- starvault-release:%s -->\n' "$RELEASE_ID" >> "$STAGE_DIR/index.html"
echo "发布 $DOMAIN 版本 $RELEASE_ID"
PREVIOUS_PAGE_HASH="$(ssh "${SSH_OPTS[@]}" "$HOST" "set -Eeuo pipefail
  if [[ -e '$WEB_ROOT' && ! -L '$WEB_ROOT' ]]; then
    echo 'WEB_ROOT 已存在且不是软链接，拒绝覆盖；请先单独迁移部署目录' >&2
    exit 1
  fi
  [[ ! -e '$STATE_DIR' && ! -e '$RELEASE_DIR' ]] || { echo '发布恢复目录已存在，拒绝复用' >&2; exit 1; }
  sudo -n install -d -m 755 '$RELEASES_DIR' '$RELEASE_DIR'
  sudo -n install -d -m 700 '$STATE_DIR'
  if [[ -L '$WEB_ROOT' ]]; then
    readlink '$WEB_ROOT' | sudo -n tee '$STATE_DIR/web.target' >/dev/null
    readlink -f '$WEB_ROOT' | sudo -n tee '$STATE_DIR/web.resolved' >/dev/null
    sudo -n test -f '$WEB_ROOT/index.html'
    sudo -n cp -a '$WEB_ROOT/index.html' '$STATE_DIR/index.previous'
    # curl 的命令替换会移除尾部换行，因此以同样字节形式记录校验值。
    old_page=\$(cat '$WEB_ROOT/index.html')
    printf '%s' \"\$old_page\" | sha256sum | cut -d' ' -f1
  fi
  if sudo -n test -f '$NGINX_TARGET'; then
    sudo -n cp -a '$NGINX_TARGET' '$STATE_DIR/nginx.previous'
  fi
")"
DEPLOY_ACTIVE=1
rsync -az --delete --exclude '.DS_Store' \
  -e "$RSYNC_SSH" --rsync-path="$RSYNC_PATH" \
  "$STAGE_DIR/" "$HOST:$RELEASE_DIR/"
rsync -az -e "$RSYNC_SSH" --rsync-path="$RSYNC_PATH" "$NGINX_CONF" "$HOST:$REMOTE_CONF"
ssh "${SSH_OPTS[@]}" "$HOST" "set -Eeuo pipefail
  sudo -n test -f '$RELEASE_DIR/index.html'
  sudo -n chown -R root:root '$RELEASE_DIR'
  if ! sudo -n cmp -s '$REMOTE_CONF' '$NGINX_TARGET'; then
    sudo -n install -m 644 -o root -g root '$REMOTE_CONF' '$NGINX_TARGET'
  fi
  # 配置先验再切换；这里失败仍须恢复此前已安装的候选配置。
  sudo -n nginx -t
  sudo -n ln -sfn '$RELEASE_DIR' '$NEXT_LINK'
  sudo -n mv -Tf '$NEXT_LINK' '$WEB_ROOT'
  sudo -n nginx -t
  sudo -n systemctl reload nginx
"

HOME_PAGE="$(curl -fsS --max-time 20 "https://$DOMAIN/")"
if ! grep -qF "<!-- starvault-release:$RELEASE_ID -->" <<< "$HOME_PAGE"; then
  echo "上线首页未返回本次发布版本 $RELEASE_ID" >&2; false
fi
if [[ -n "$FILING_TEXT" ]] && ! grep -qF "$FILING_TEXT" <<< "$HOME_PAGE"; then
  echo "线上页面未包含备案信息" >&2; false
fi
if ! RUNTIME_CONFIG="$(curl -fsS --max-time 20 "https://$DOMAIN/runtime-config.js")"; then
  echo "线上 runtime-config.js 请求失败" >&2; false
fi
# Both command substitutions strip only trailing newlines. Match the actual
# staged configuration, not just a proxy string that an old/wrong file may share.
EXPECTED_RUNTIME="$(cat "$STAGE_DIR/runtime-config.js")"
if [[ "$RUNTIME_CONFIG" != "$EXPECTED_RUNTIME" ]] || ! grep -qF "$EXA_PROXY_PATH" <<< "$RUNTIME_CONFIG"; then
  echo "线上 runtime-config.js 与本次发布配置不一致" >&2; false
fi

# 用无效 Key 探针确认代理链路；没有真实凭据或付费请求。
EXA_PROBE="$(curl -sS --max-time 20 -w '\n%{http_code}' -X POST "https://$DOMAIN/api/exa/search" \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: starvault-deploy-probe' \
  -d '{"query":"starvault deploy probe","type":"auto","numResults":1}' || true)"
EXA_PROBE_STATUS="${EXA_PROBE##*$'\n'}"
EXA_PROBE_BODY="${EXA_PROBE%$'\n'*}"
if [[ "$EXA_PROBE_STATUS" != "401" || "$EXA_PROBE_BODY" != *INVALID_API_KEY* ]]; then
  echo "Exa 代理未生效（HTTP ${EXA_PROBE_STATUS:-无响应}）：${EXA_PROBE_BODY:0:200}" >&2; false
fi
DEPLOY_ACCEPTED=1

# 仅验收通过后清理；上一个静态恢复目标即使超出 keep 数也保留。
ssh "${SSH_OPTS[@]}" "$HOST" "set -Eeuo pipefail
  previous=''
  if sudo -n test -f '$STATE_DIR/web.target'; then
    previous=\$(sudo -n cat '$STATE_DIR/web.resolved')
  fi
  releases=\$(find '$RELEASES_DIR' -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\\n' | sort -nr | cut -d' ' -f2-)
  count=0
  while IFS= read -r old; do
    count=\$((count + 1))
    old_resolved=\$(readlink -f \"\$old\")
    if (( count > $RELEASES_TO_KEEP )) && [[ \"\$old\" != '$RELEASE_DIR' && \"\$old_resolved\" != \"\$previous\" ]]; then
      sudo -n rm -rf -- \"\$old\"
    fi
  done <<< \"\$releases\"
"
echo "部署完成：https://$DOMAIN/（恢复资料：$STATE_DIR）"
