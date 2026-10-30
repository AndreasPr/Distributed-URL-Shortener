# Frontend audit before upgrade

Captured 2026-10-30 with `cd frontend && npm audit --json` (exit 1).

Includes runtime and development dependencies. Counts are package findings, not proof of exploitability.

```json
{
  "info": 0,
  "low": 2,
  "moderate": 4,
  "high": 19,
  "critical": 2,
  "total": 27
}
```

| Package | Severity | Direct | Suggested fix |
|---|---|---|---|
| @babel/core | low | False | true |
| @hono/node-server | moderate | False | true |
| @modelcontextprotocol/sdk | high | False | true |
| @next/eslint-plugin-next | high | False | {"name": "eslint-config-next", "version": "16.4.3", "isSemVerMajor": true} |
| axios | high | True | true |
| baseline-browser-mapping | moderate | False | true |
| body-parser | high | False | true |
| brace-expansion | high | False | true |
| browserslist | high | False | true |
| deepmerge | low | False | {"name": "shadcn", "version": "1.0.0", "isSemVerMajor": true} |
| eslint-config-next | high | True | {"name": "eslint-config-next", "version": "16.4.3", "isSemVerMajor": true} |
| fast-uri | high | False | true |
| follow-redirects | high | False | true |
| form-data | high | False | true |
| glob | high | False | {"name": "eslint-config-next", "version": "16.4.3", "isSemVerMajor": true} |
| hono | high | False | true |
| ip-address | high | False | true |
| js-yaml | high | False | true |
| nanoid | high | False | true |
| next | critical | True | {"name": "next", "version": "16.4.3", "isSemVerMajor": true} |
| postcss | high | True | {"name": "next", "version": "16.4.3", "isSemVerMajor": true} |
| postcss-selector-parser | moderate | False | true |
| proxy-addr | critical | False | true |
| qs | moderate | False | true |
| shadcn | high | True | {"name": "shadcn", "version": "1.0.0", "isSemVerMajor": true} |
| source-map-js | high | False | true |
| zod | high | False | {"name": "shadcn", "version": "1.0.0", "isSemVerMajor": true} |

## Advisory details

- [@babel/core: Arbitrary File Read via sourceMappingURL Comment](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) — low; affected range `<=7.29.0`.
- [Node.js Adapter for Hono: Path traversal in `serve-static` on Windows via encoded backslash (`%5C`)](https://github.com/advisories/GHSA-frvp-7c67-39w9) — moderate; affected range `<1.19.15`.
- [@hono/node-server: `serveStatic` decodes the request path a second time, leading to bypass of middleware on static paths](https://github.com/advisories/GHSA-rmxm-3fg6-px4f) — moderate; affected range `>=1.19.10 <2.1.3`.
- [MCP TypeScript SDK: OAuth client could send credentials to an authorization server chosen by the MCP server](https://github.com/advisories/GHSA-6qxp-vccf-f47h) — high; affected range `>=1.12.0 <1.31.0`.
- [MCP TypeScript SDK: Experimental tasks were not tied to the session that created them](https://github.com/advisories/GHSA-22jm-h49p-29qw) — high; affected range `>=1.24.0 <1.32.0`.
- [MCP TypeScript client SDK: HTTP client transports and OAuth requests followed cross-origin redirects and re-sent custom headers and request bodies](https://github.com/advisories/GHSA-6prh-2h8m-c8cw) — moderate; affected range `<1.32.0`.
- [MCP TypeScript SDK: One HTTP request within the default size limit could exhaust server memory during validation](https://github.com/advisories/GHSA-46jr-4wx8-v453) — high; affected range `>=1.3.0 <1.32.0`.
- [MCP TypeScript SDK: Server bearer authentication accepted tokens issued for another service](https://github.com/advisories/GHSA-rvq5-wwqv-78pq) — moderate; affected range `>=1.6.0 <1.32.0`.
- [MCP TypeScript SDK: HTTP server transports and handlers did not limit request body size or JSON-RPC batch length](https://github.com/advisories/GHSA-f897-62hf-6gxq) — high; affected range `>=1.10.0 <1.30.1`.
- [Axios: Prototype pollution auth subfields can inject Basic auth](https://github.com/advisories/GHSA-xj6q-8x83-jv6g) — moderate; affected range `>=1.15.2 <1.18.0`.
- [Axios: Prototype pollution gadgets can alter axios request construction](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) — moderate; affected range `>=1.0.0 <1.18.0`.
- [Axios: Deep formToJSON Key Recursion Can Cause Denial of Service](https://github.com/advisories/GHSA-pmv8-rq9r-6j72) — moderate; affected range `>=1.0.0 <1.18.0`.
- [Axios: HTTP/2 streamed uploads bypass `maxBodyLength`](https://github.com/advisories/GHSA-mwf2-3pr3-8698) — moderate; affected range `>=1.13.0 <1.18.0`.
- [Axios Node HTTP adapter can use an inherited proxy after interceptor config cloning](https://github.com/advisories/GHSA-gcfj-64vw-6mp9) — high; affected range `>=1.15.2 <1.18.0`.
- [Axios: Nested axios option objects can consume polluted prototype values](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) — moderate; affected range `>=1.0.0 <1.18.0`.
- [Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength`](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9) — moderate; affected range `>=1.7.0 <1.18.0`.
- [Axios: NO_PROXY bypass for 0.0.0.0 local addresses in axios](https://github.com/advisories/GHSA-f4gw-2p7v-4548) — moderate; affected range `>=1.15.0 <1.18.0`.
- [Axios: Excessive recursion in formDataToJSON can cause denial of service](https://github.com/advisories/GHSA-42h9-826w-cgv3) — moderate; affected range `>=1.0.0 <1.18.0`.
- [Axios form serializer maxDepth bypass via {} metatoken](https://github.com/advisories/GHSA-hcpx-6fm6-wx23) — moderate; affected range `>=1.15.1 <1.18.0`.
- [Axios: Prototype pollution gadget in fetch adapter can alter outbound requests](https://github.com/advisories/GHSA-vh66-26gq-q6x8) — moderate; affected range `>=1.7.0 <1.20.0`.
- [Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method](https://github.com/advisories/GHSA-9fr6-4gfg-395g) — moderate; affected range `>=1.0.0 <1.20.0`.
- [Axios: ReDoS in fromDataURI data: URL parser freezes the Node event loop (DoS)](https://github.com/advisories/GHSA-c29m-xwm3-cm6r) — high; affected range `>=1.16.1 <1.20.0`.
- [Axios: ReDoS (O(N²)) in shouldBypassProxy host normalization, reachable via untrusted redirect Location](https://github.com/advisories/GHSA-mghh-pgcx-3jjj) — high; affected range `>=1.15.0 <1.20.0`.
- [Axios: Prototype Pollution Gadget in axios toFormData Options](https://github.com/advisories/GHSA-x97p-jq2g-jp4f) — high; affected range `>=1.15.1 <1.20.0`.
- [Axios: HTTP/2 adapter bypasses configured DNS lookup and proxy controls](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v) — high; affected range `>=1.13.0 <1.20.0`.
- [Axios: Denial of Service via Unhandled 'error' Event in HTTP/2 ClientHttp2Session Initialization](https://github.com/advisories/GHSA-542g-h47m-68v8) — high; affected range `>=1.13.0 <1.20.0`.
- [Axios: Header Injection via Inherited headers After Minimal Interceptor](https://github.com/advisories/GHSA-j8rh-479h-cp32) — moderate; affected range `>=1.0.0 <1.20.0`.
- [Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) — moderate; affected range `>=1.12.0 <1.20.0`.
- [Axios: Node HTTP adapter prototype-pollution gadget allows request socket hijack via inherited createConnection](https://github.com/advisories/GHSA-m8m8-qj5v-23w3) — high; affected range `>=1.15.2 <1.20.0`.
- [Axios: CIDR-form NO_PROXY entries are ignored, causing proxy exclusion bypass for internal IP ranges](https://github.com/advisories/GHSA-44g4-m2mj-wpvx) — moderate; affected range `>=1.15.0 <1.20.0`.
- [baseline-browser-mapping process termination on invalid input causes denial of service](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) — moderate; affected range `>=2.0.0 <2.11.0`.
- [body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement](https://github.com/advisories/GHSA-v422-hmwv-36x6) — low; affected range `>=2.0.0 <2.3.0`.
- [body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body](https://github.com/advisories/GHSA-27r3-jxmh-p828) — high; affected range `>=2.0.0 <2.4.0`.
- [brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) — high; affected range `<1.1.16`.
- [brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — high; affected range `<1.1.17`.
- [brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation](https://github.com/advisories/GHSA-rgw5-rvv9-x895) — high; affected range `>=4.0.0 <5.0.9`.
- [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — moderate; affected range `<1.1.21`.
- [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion](https://github.com/advisories/GHSA-qhr7-859c-m2p7) — high; affected range `<1.1.20`.
- [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) — high; affected range `<1.1.19`.
- [Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) — high; affected range `<=4.28.6`.
- [Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)](https://github.com/advisories/GHSA-73wf-gq98-2v4g) — high; affected range `<=4.28.6`.
- [deepmerge mergeObject() allows prototype poisoning of returned objects](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) — low; affected range `>=4.2.0 <=4.3.1`.
- [fast-uri vulnerable to host confusion via literal backslash authority delimiter](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) — high; affected range `>=3.0.0 <=3.1.3`.
- [fast-uri vulnerable to host confusion via backslash authority introducer](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) — high; affected range `>=3.0.0 <3.1.5`.
- [fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization](https://github.com/advisories/GHSA-f65p-4m7j-42xc) — high; affected range `>=3.0.0 <3.1.6`.
- [fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) — high; affected range `>=3.1.2 <3.1.6`.
- [fast-uri vulnerable to host confusion via percent-encoded scheme normalization](https://github.com/advisories/GHSA-jqff-g426-hqxp) — high; affected range `>=3.0.0 <3.1.6`.
- [fast-uri vulnerable to host confusion via failed IDN canonicalization](https://github.com/advisories/GHSA-4c8g-83qw-93j6) — high; affected range `>=3.0.0 <3.1.3`.
- [fast-uri vulnerable to authority injection via an unvalidated port in serialize](https://github.com/advisories/GHSA-qw65-cvwx-89v3) — high; affected range `>=3.0.0 <3.1.7`.
- [fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) — moderate; affected range `>=3.0.0 <3.1.8`.
- [fast-uri vulnerable to URI scheme spoofing via percent-encoded scheme decoding](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) — moderate; affected range `>=3.0.0 <3.1.9`.
- [fast-uri vulnerable to improper path equivalence in relative reference normalization](https://github.com/advisories/GHSA-xhq7-xmqj-769h) — low; affected range `>=3.0.0 <3.1.9`.
- [fast-uri vulnerable to scheme injection via an unescaped first-segment colon in suffix references](https://github.com/advisories/GHSA-333x-w4r6-6crp) — low; affected range `>=3.0.0 <3.1.9`.
- [follow-redirects array-form headers bypass cross-origin credential stripping](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8) — high; affected range `>=1.16.0 <1.16.1`.
- [follow-redirects sensitiveHeaders regex escaping can expose credential headers](https://github.com/advisories/GHSA-8r9p-f939-6h3c) — high; affected range `>=1.16.0 <1.16.1`.
- [form-data: CRLF injection in form-data via unescaped multipart field names and filenames](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) — high; affected range `>=4.0.0 <4.0.6`.
- [glob CLI: Command injection via -c/--cmd executes matches with shell:true](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) — high; affected range `>=10.2.0 <10.5.0`.
- [Hono: IP Restriction bypasses static deny rules for non-canonical IPv6 ](https://github.com/advisories/GHSA-xrhx-7g5j-rcj5) — moderate; affected range `<4.12.21`.
- [Hono: Cookie helper does not sanitize sameSite and priority, allowing Set-Cookie injection](https://github.com/advisories/GHSA-3hrh-pfw6-9m5x) — moderate; affected range `<4.12.21`.
- [Hono: JWT middleware accepts any Authorization scheme, not only Bearer](https://github.com/advisories/GHSA-f577-qrjj-4474) — moderate; affected range `<4.12.21`.
- [Hono: app.mount() strips mount prefix using undecoded path, causing incorrect routing for percent-encoded paths](https://github.com/advisories/GHSA-2gcr-mfcq-wcc3) — moderate; affected range `<4.12.21`.
- [hono: Body Limit Middleware can be bypassed on AWS Lambda by understating `Content-Length`](https://github.com/advisories/GHSA-rv63-4mwf-qqc2) — moderate; affected range `<4.12.25`.
- [hono: Lambda@Edge adapter keeps only the last value of a repeated request header, dropping the rest](https://github.com/advisories/GHSA-wgpf-jwqj-8h8p) — moderate; affected range `<4.12.25`.
- [hono: CORS Middleware reflects any Origin with credentials when `origin` defaults to the wildcard](https://github.com/advisories/GHSA-88fw-hqm2-52qc) — high; affected range `<4.12.25`.
- [hono: Path traversal in `serve-static` on Windows via encoded backslash (`%5C`)](https://github.com/advisories/GHSA-wwfh-h76j-fc44) — moderate; affected range `<4.12.25`.
- [hono: AWS Lambda adapter merges multiple `Set-Cookie` headers into one value, dropping cookies on ALB single-header and Lattice](https://github.com/advisories/GHSA-j6c9-x7qj-28xf) — moderate; affected range `<4.12.25`.
- [Hono: API Gateway v1 adapter can drop a distinct repeated request header value during de-duplication](https://github.com/advisories/GHSA-xgm2-5f3f-mvvc) — moderate; affected range `>=4.3.3 <4.12.27`.
- [hono/jsx does not isolate context per request, leading to cross-request data disclosure](https://github.com/advisories/GHSA-hvrm-45r6-mjfj) — moderate; affected range `>=4.11.8 <4.12.27`.
- [Hono: Server-Side XSS via JSX Escaping Bypass in cx() Utility](https://github.com/advisories/GHSA-w62v-xxxg-mg59) — moderate; affected range `>=4.0.0 <4.12.27`.
- [Hono: ReDoS in CORS middleware via Access-Control-Request-Headers](https://github.com/advisories/GHSA-8j4g-w8fx-2239) — moderate; affected range `<4.12.34`.
- [Hono: `memo()` retains SSR output across requests, leading to cross-user data disclosure](https://github.com/advisories/GHSA-f23p-vx2j-j53r) — moderate; affected range `>=3.8.0 <4.12.34`.
- [Hono: Proxy Helper does not remove response headers listed in the `Connection` header](https://github.com/advisories/GHSA-79qm-7rj5-m7r9) — low; affected range `>=4.7.0 <4.12.34`.
- [Hono: Algorithmic Complexity DoS in Language Middleware](https://github.com/advisories/GHSA-54fx-42gc-7vw4) — moderate; affected range `>=4.12.0 <4.12.34`.
- [Hono: Incomplete fix for CVE-2026-39408: `toSSG()` still writes files outside the output directory](https://github.com/advisories/GHSA-gqvv-2mrq-wpjv) — moderate; affected range `<4.13.5`.
- [Hono: Unbounded dot-notation nesting in `parseBody()` can cause memory exhaustion](https://github.com/advisories/GHSA-g6gw-c38x-mqfc) — moderate; affected range `<4.13.5`.
- [Hono: Query parser reads parameters after the URL fragment, causing cache-key and proxy interpretation differentials](https://github.com/advisories/GHSA-crvj-82cr-hjcx) — moderate; affected range `<4.13.5`.
- [hono/jsx renders plain strings unescaped in boundary components, leading to XSS](https://github.com/advisories/GHSA-hxh3-vqpv-xpqv) — moderate; affected range `<4.13.7`.
- [Hono: `serveStatic` decodes the request path a second time, leading to bypass of middleware on static paths](https://github.com/advisories/GHSA-5r4p-p66f-jhc7) — moderate; affected range `>=4.12.4 <4.13.11`.
- [ip-address: Address4 decodes leading-zero octets as decimal while resolvers decode them as octal, allowing SSRF and trust-boundary bypass](https://github.com/advisories/GHSA-mwp4-54f8-5fhr) — high; affected range `<=10.3.0`.
- [ip-address: a CIDR suffix on the parsed address suppresses special-use classification and can bypass SSRF and trust-boundary checks](https://github.com/advisories/GHSA-4xrf-jv44-h6hh) — moderate; affected range `>=10.1.1 <=10.2.1`.
- [ip-address: misclassification of IPv4-mapped/NAT64 IPv6 addresses can bypass SSRF and trust-boundary checks](https://github.com/advisories/GHSA-22jq-vg5j-6vgg) — moderate; affected range `>=10.1.1 <=10.2.0`.
- [ip-address: Address6.isLinkLocal() recognizes fe80::/64 rather than fe80::/10, allowing SSRF and trust-boundary bypass to on-link hosts](https://github.com/advisories/GHSA-rpw4-54j3-4h4q) — moderate; affected range `<=10.5.0`.
- [ip-address: no classifier recognizes the NAT64 local-use range 64:ff9b:1::/48, allowing SSRF and trust-boundary bypass](https://github.com/advisories/GHSA-2vr4-cq9g-pvrc) — moderate; affected range `>=10.2.0 <=10.5.0`.
- [ip-address: isInSubnet() and isHostInSubnet() compare addresses of different families as if they shared an address space, allowing an allowlist check to admit an address outside its range](https://github.com/advisories/GHSA-j6r3-76f7-8jcv) — moderate; affected range `<=10.7.0`.
- [ip-address: Address6 builds a parse diagnostic proportional to the input with no length bound, allowing a single long string to stall or crash the process](https://github.com/advisories/GHSA-h3mg-xc3c-68pw) — moderate; affected range `<=10.7.0`.
- [ip-address: Address6 matches a zone identifier in quadratic time ahead of its length limit, allowing a single long string to stall the process](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5) — moderate; affected range `<=10.7.3`.
- [JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases](https://github.com/advisories/GHSA-h67p-54hq-rp68) — moderate; affected range `>=4.0.0 <=4.1.1`.
- [js-yaml: YAML merge-key chains can force quadratic CPU consumption](https://github.com/advisories/GHSA-52cp-r559-cp3m) — high; affected range `>=4.0.0 <4.3.0`.
- [JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) — high; affected range `>=4.0.0 <4.3.1`.
- [js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources](https://github.com/advisories/GHSA-2883-xcg3-v3hh) — high; affected range `>=4.0.0 <4.3.2`.
- [nanoid: non-secure generators can loop indefinitely with negative size](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) — high; affected range `<3.3.16`.
- [nanoid: custom generators can loop indefinitely when size is zero](https://github.com/advisories/GHSA-2v37-7h3g-55p8) — high; affected range `<3.3.18`.
- [Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) — moderate; affected range `>=10.0.0 <15.5.10`.
- [Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components](https://github.com/advisories/GHSA-h25m-26qc-wcjf) — high; affected range `>=13.0.0 <15.0.8`.
- [Next.js: HTTP request smuggling in rewrites](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) — moderate; affected range `>=9.5.0 <15.5.13`.
- [Next.js: Unbounded next/image disk cache growth can exhaust storage](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) — moderate; affected range `>=10.0.0 <15.5.14`.
- [Next.js has a Denial of Service with Server Components](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) — high; affected range `>=13.0.0 <15.5.15`.
- [Next.js Vulnerable to Denial of Service with Server Components](https://github.com/advisories/GHSA-8h8q-6873-q5fj) — high; affected range `>=13.0.0 <15.5.16`.
- [Next.js's Middleware / Proxy redirects can be cache-poisoned](https://github.com/advisories/GHSA-3g8h-86w9-wvmq) — low; affected range `>=12.2.0 <15.5.16`.
- [Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q) — moderate; affected range `>=13.4.0 <15.5.16`.
- [Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting](https://github.com/advisories/GHSA-vfv6-92ff-j949) — low; affected range `>=13.4.6 <15.5.16`.
- [Next.js has cross-site scripting in beforeInteractive scripts with untrusted input](https://github.com/advisories/GHSA-gx5p-jg67-6x7h) — moderate; affected range `>=13.0.0 <15.5.16`.
- [Next.js has a Denial of Service in the Image Optimization API](https://github.com/advisories/GHSA-h64f-5h5j-jqjh) — moderate; affected range `>=10.0.0 <15.5.16`.
- [Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades](https://github.com/advisories/GHSA-c4j6-fc7j-m34r) — high; affected range `>=13.4.13 <15.5.16`.
- [Next.js vulnerable to cache poisoning in React Server Component responses](https://github.com/advisories/GHSA-wfc6-r584-vfw7) — moderate; affected range `>=14.2.0 <15.5.16`.
- [Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n](https://github.com/advisories/GHSA-36qx-fr4f-26g5) — high; affected range `>=12.2.0 <15.5.16`.
- [Next.js: Denial of Service in App Router using Server Actions](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) — high; affected range `>=13.0.0 <15.5.21`.
- [Next.js: Server-Side Request Forgery in Server Actions on custom servers](https://github.com/advisories/GHSA-89xv-2m56-2m9x) — high; affected range `>=14.1.1 <15.5.21`.
- [Next.js: Cache confusion of response bodies for requests with bodies](https://github.com/advisories/GHSA-68g3-v927-f742) — moderate; affected range `>=13.0.0 <15.5.21`.
- [Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences](https://github.com/advisories/GHSA-4633-3j49-mh5q) — moderate; affected range `>=13.0.0 <15.5.21`.
- [Next.js: Unbounded Server Action payload in Edge runtime](https://github.com/advisories/GHSA-4c39-4ccg-62r3) — moderate; affected range `>=13.0.0 <15.5.21`.
- [Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) — high; affected range `>=12.0.0 <15.5.21`.
- [Next.js: Unauthenticated disclosure of internal Server Function endpoints](https://github.com/advisories/GHSA-955p-x3mx-jcvp) — moderate; affected range `>=13.0.0 <15.5.21`.
- [Next.js: Unauthenticated Remote Code Execution on windows-hosted servers](https://github.com/advisories/GHSA-p293-qw3h-jr36) — critical; affected range `>=13.4.0 <15.5.24`.
- [Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) — critical; affected range `>=10.0.0 <15.5.24`.
- [Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used](https://github.com/advisories/GHSA-2464-fhr4-w9xw) — critical; affected range `>=10.0.0 <=15.5.27`.
- [Next.js: Denial of Service in App Router using Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) — high; affected range `>=13.0.0 <=15.5.27`.
- [PostCSS has XSS via Unescaped </style> in its CSS Stringify Output](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — moderate; affected range `<8.5.10`.
- [PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments](https://github.com/advisories/GHSA-6g55-p6wh-862q) — high; affected range `<=8.5.11`.
- [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) — moderate; affected range `<=8.5.22`.
- [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849) — high; affected range `<=8.5.17`.
- [postcss-selector-parser allows denial of service through uncontrolled AST recursion](https://github.com/advisories/GHSA-w9m9-85wc-3x92) — low; affected range `>=7.1.0 <7.1.3`.
- [PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) — moderate; affected range `<6.1.5`.
- [proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) — critical; affected range `>=1.1.0 <2.0.8`.
- [qs array-limit bypass via bracket-key comma parsing](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) — moderate; affected range `>=6.14.2 <=6.15.3`.
- [qs: Denial of Service via Attacker Controlled isBuffer](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) — moderate; affected range `>=2.2.5 <6.16.0`.
- [qs : qs.stringify with arrayFormat 'comma' throws an uncaught TypeError on array elements carrying a non-callable own toString (DoS)](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) — moderate; affected range `>=6.7.0 <=6.16.0`.
- [source-map-js allows event-loop denial of service through indexed source-map section offsets](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) — high; affected range `>=1.0.0 <1.2.2`.
- [Zod can exhaust memory while validating oversized constrained collections](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — high; affected range `<4.6.6`.
