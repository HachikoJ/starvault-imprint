# Security Policy

星仓印记当前按本地优先工具设计，默认适合运行在个人电脑或可信内网环境。

## Supported Use

- Recommended host: `127.0.0.1`.
- Recommended deployment: personal/local/private.
- Not recommended: exposing the Node.js service directly to the public Internet.

## Critical Notes

- Do not commit `.env`.
- Do not commit `data/`; it may contain API keys, GitHub action state, project notes, AI analysis, user behavior, and long-term memory.
- Do not commit `.agents/`, `.playwright-cli/`, `output/`, `canvas/`, or `lark-auth-qrcode.png`.
- API keys configured in the UI are stored locally in `data/store.json` in plaintext.
- The app has lightweight single-user protections, but no multi-user permission model.
- `/api/settings?reveal=...` can reveal configured keys to the local browser session by design.
- GitHub Star/Fork operations use the configured GitHub token and can mutate the authenticated account.
- AI analysis sends selected repository context and user-entered analysis needs to the configured AI provider.
- Tavily, Exa, GitHub, and AI providers receive request metadata according to their own terms and privacy policies.
- Browser developer tools cannot be reliably disabled. Treat all client-side code and UI state as user-controlled; server-side checks must protect every sensitive operation.

## Built-in Application Protections

The Node server includes basic application-layer hardening for local/private use:

- optional shared-token authentication through `AUTH_TOKEN`;
- same-origin/loopback checks for browser state-changing requests;
- Fetch Metadata checks for API requests, reducing cross-site probing from modern browsers;
- per-IP rate limits for general API traffic, write operations, scan requests, AI-heavy requests, static assets, and failed authentication attempts;
- stricter throttling for common crawler/scanner user agents;
- request URI, path, query count, query length, JSON body size, and JSON content-type checks;
- JSON body sanitization that drops prototype-pollution keys such as `__proto__`, `prototype`, and `constructor`;
- static-file realpath checks to prevent `..` traversal outside `public/`;
- explicit blocking for common source/sensitive-path probes such as `.env`, `.git`, `src/`, `data/`, `node_modules/`, project docs, and source maps;
- `robots.txt`, `X-Robots-Tag`, and HTML robots meta tags to discourage indexing, archiving, snippets, and image indexing;
- a small client bootstrap that dynamically loads runtime scripts, so the HTML no longer lists every application script entry directly;
- browser Fetch-Dest checks for static files, so JavaScript and CSS are served for their intended resource type instead of direct document navigation in modern browsers;
- security response headers, including `nosniff`, frame blocking, referrer policy, permissions policy, and a restrictive CSP;
- HTTP header/request timeouts, max header count, and malformed-client fallback handling.

These protections reduce common injection, brute-force, crawler, source-probing, and low-cost abuse risks. They do not make public frontend JavaScript private, and they are not a substitute for edge-level DDoS protection.

## Before Public Deployment

Do not publish this service directly to the public Internet. Before public deployment, place it behind a hardened reverse proxy/CDN/WAF and add, at minimum:

- strong authentication and authorization suitable for your deployment;
- encrypted secret storage or external secret management;
- TLS, origin allow-lists, request body limits, slow-request protection, IP reputation controls, and DDoS mitigation at the proxy/CDN layer;
- bot-management rules for high-volume crawlers and source-scraping attempts;
- audit logs, alerting, and abuse monitoring;
- a separate production data store and backup policy;
- a review of every API endpoint that can reveal secrets or mutate account state.

## Reporting

Please report security issues privately by email: 946106011@qq.com.
