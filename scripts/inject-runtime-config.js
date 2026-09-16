#!/usr/bin/env node

/**
 * 把 Exa 代理地址写进静态产物的 runtime-config.js。
 *
 * 腾讯云部署注入同源路径 /api/exa/search，GitHub Pages 镜像注入主站绝对地址；
 * 仓库里的默认值为空，只在本机（localhost）直连时才成立。
 *
 * 用法：node scripts/inject-runtime-config.js <runtime-config.js> <代理地址>
 */

const fs = require("node:fs");

const PLACEHOLDER = /^window\.__STARVAULT_EXA_PROXY__ = "";$/m;
const ALLOWED_PROXY = /^(?:\/[^\s]*|https:\/\/[^\s]+)$/;

function main() {
  const [target, proxyUrl] = process.argv.slice(2);
  if (!target || !proxyUrl) {
    console.error("用法：node scripts/inject-runtime-config.js <runtime-config.js> <代理地址>");
    process.exit(1);
  }
  if (!ALLOWED_PROXY.test(proxyUrl)) {
    console.error(`Exa 代理地址必须是同源路径或 https 地址：${proxyUrl}`);
    process.exit(1);
  }

  const source = fs.readFileSync(target, "utf8");
  if (!PLACEHOLDER.test(source)) {
    console.error(`${target} 缺少 __STARVAULT_EXA_PROXY__ 占位行`);
    process.exit(1);
  }

  fs.writeFileSync(target, source.replace(PLACEHOLDER, `window.__STARVAULT_EXA_PROXY__ = ${JSON.stringify(proxyUrl)};`));
  console.log(`已注入 Exa 代理：${proxyUrl}`);
}

main();
