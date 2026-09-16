window.__STARVAULT_DEPLOYMENT__ = "static";
// Exa 的浏览器跨域白名单只放行它自己的控制台和 localhost，静态站点必须经由
// 同源代理访问；留空表示直连（仅本机可用），部署脚本会注入实际地址。
window.__STARVAULT_EXA_PROXY__ = "";
