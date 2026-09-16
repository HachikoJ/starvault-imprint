#!/usr/bin/env bash
# 把仓库里的 public/ 静态产物发布到腾讯云主机，并让 starvault.deline.top
# 指向新版本。发布采用 releases + 软链接：上传完成前不会切换线上目录，
# 失败时线上仍是上一个可用版本。
#
# 用法：
#   SSH_KEY=~/.ssh/starvault_deploy deploy/deploy-static.sh
#
# 属地合规信息（如备案号）不进入仓库：设置 ICP_NUMBER 或写入未跟踪文件
# deploy/filing.local，发布时会注入到线上页脚的 deployment:extra-footer-link 位置。

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

SSH_OPTS=(-i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes)
RSYNC_SSH="ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes"
RSYNC_PATH="sudo rsync"

fail() {
  echo "部署失败：$1" >&2
  exit 1
}

[[ -f "$PUBLIC_DIR/index.html" ]] || fail "缺少 public/index.html"
[[ -f "$PUBLIC_DIR/demo-snapshot.json" ]] || fail "缺少 public/demo-snapshot.json"
[[ -f "$SSH_KEY" ]] || fail "找不到 SSH 私钥 $SSH_KEY，可用 SSH_KEY=... 指定"
[[ -f "$NGINX_CONF" ]] || fail "缺少 nginx 配置 $NGINX_CONF"

grep -q '"static"' "$PUBLIC_DIR/runtime-config.js" || fail "runtime-config.js 未指向 static 模式"
if find "$PUBLIC_DIR" -name '.DS_Store' -print -quit | grep -q .; then
  fail "public/ 中存在 .DS_Store，请先清理"
fi

STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/starvault-imprint-deploy.XXXXXX")"
cleanup() { rm -rf "$STAGE_DIR"; }
trap cleanup EXIT

rsync -a --delete --exclude '.DS_Store' "$PUBLIC_DIR/" "$STAGE_DIR/"

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
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-$COMMIT_SHA"
RELEASES_DIR="$DEPLOY_ROOT/releases"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
NEXT_LINK="$WEB_ROOT.next-$$"

echo "发布 $DOMAIN 版本 $RELEASE_ID"
ssh "${SSH_OPTS[@]}" "$HOST" "set -Eeuo pipefail
  sudo -n install -d -m 755 '$RELEASES_DIR'
  sudo -n install -d -m 755 '$RELEASE_DIR'
"
rsync -az --delete --exclude '.DS_Store' \
  -e "$RSYNC_SSH" --rsync-path="$RSYNC_PATH" \
  "$STAGE_DIR/" "$HOST:$RELEASE_DIR/"
ssh "${SSH_OPTS[@]}" "$HOST" "sudo -n chown -R root:root '$RELEASE_DIR'"

ssh "${SSH_OPTS[@]}" "$HOST" "set -Eeuo pipefail
  if [[ ! -f '$RELEASE_DIR/index.html' ]]; then
    echo '远端缺少 index.html，拒绝切换' >&2
    exit 1
  fi
  sudo -n ln -sfn '$RELEASE_DIR' '$NEXT_LINK'
  sudo -n mv -Tf '$NEXT_LINK' '$WEB_ROOT'
"

rsync -az -e "$RSYNC_SSH" "$NGINX_CONF" "$HOST:/tmp/starvault.deline.top.conf"
ssh "${SSH_OPTS[@]}" "$HOST" "set -Eeuo pipefail
  if ! sudo -n cmp -s /tmp/starvault.deline.top.conf '$NGINX_TARGET'; then
    sudo -n install -m 644 -o root -g root /tmp/starvault.deline.top.conf '$NGINX_TARGET'
  fi
  rm -f /tmp/starvault.deline.top.conf
  sudo -n nginx -t
  sudo -n systemctl reload nginx
"

ssh "${SSH_OPTS[@]}" "$HOST" "set -Eeuo pipefail
  mapfile -t releases < <(find '$RELEASES_DIR' -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)
  for old in \"\${releases[@]:$RELEASES_TO_KEEP}\"; do
    [[ \"\$old\" == '$RELEASE_DIR' ]] || sudo -n rm -rf -- \"\$old\"
  done
"

curl -fsS --max-time 20 "https://$DOMAIN/" >/dev/null || fail "部署后 $DOMAIN 未正常响应"
if [[ -n "$FILING_TEXT" ]]; then
  curl -fsS --max-time 20 "https://$DOMAIN/" | grep -qF "$FILING_TEXT" || fail "线上页面未包含备案信息"
fi

echo "部署完成：https://$DOMAIN/"
