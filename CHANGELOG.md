# Changelog

All notable changes to `@clawfetch/mcp` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2026-09-18

### Fixed
- `check_domains` and `suggest_domains` now read the live API response shape. Previously they failed after a paid call.
- `suggest_domains` replaces the ignored `count` option with `maxCheck` (1-50 candidates checked) and reports checked/generated counts.
- Inconclusive WHOIS lookups show as unknown instead of taken.
- Domain tool prices corrected to $0.003. The `clawfetch://pricing` resource now matches the live price sheet and includes `/parse`.

### Removed
- The public hosted endpoint `mcp.clawfetch.ai` is retired. Run the MCP locally with your own funded wallet.

## [0.3.1] - 2026-08-06

### Changed
- Tool descriptions, prompts, resources and llms.txt updated to the live ClawFetch price sheet: `render_page` $0.005, `extract_data` $0.008, `parse_document` $0.005, `research_topic` $0.02, `check_domains`/`suggest_domains` $0.003. `fetch_url` and `list_extractors` unchanged at $0.001.

## [0.3.0] - 2026-08-05

### Added
- `parse_document` tool — parse office documents (docx, pptx, xlsx, pdf, odt, ods, odp, rtf, epub, csv, doc, ppt) into GitHub-Flavored Markdown via the ClawFetch `POST /parse` endpoint ($0.002). Accepts a document `url` or local file `path`, with optional `format` override. No OCR — scanned/image-only PDFs are rejected.

## [0.2.0] - 2026-03-30

### Added
- **4 MCP resources** for agent discovery and session monitoring:
  - `clawfetch://pricing` — endpoint pricing table with x402 payment flow details
  - `clawfetch://extractors` — live list of supported structured data extractors with domains and fields
  - `clawfetch://wallet` — wallet address, network, and balance link for x402 payments
  - `clawfetch://usage` — per-session request counts and estimated cost tracking
- **4 MCP prompt templates** for guided multi-tool workflows:
  - `research-topic` — multi-source research with fetch + extract follow-up ($0.013-$0.022)
  - `competitive-analysis` — company/product comparison with structured data ($0.02-$0.05)
  - `domain-hunting` — creative domain name discovery with availability checks ($0.004-$0.010)
  - `site-audit` — content quality, SEO, and technical analysis ($0.003-$0.006)
- 14 new tests (resources + prompts), **34 total** (all passing)

## [0.1.0] - 2026-03-30

### Added
- Initial release of the ClawFetch MCP server
- **9 MCP tools**: `fetch_url`, `render_page`, `extract_data`, `research_topic`, `check_domains`, `suggest_domains`, `list_extractors`, `health_check`, `wallet_info`
- **Dual transport**: stdio (default, for Claude Desktop / local clients) and HTTP (Streamable HTTP for remote access)
- Automatic x402 micropayments via bundled `@clawfetch/sdk` — USDC on Base, no API keys
- HTTP mode with Express server, per-session MCP transports, `/health` endpoint
- Modular tool architecture: 5 tool modules (fetch, research, domains, extract, utility)
- Configurable via environment variables: private key, base URL, transport, host, port, timeout, debug
- Global `npx`/`npm install -g` CLI entry point (`clawfetch-mcp`)
- 20 vitest tests: 7 unit tests + 13 integration tests via in-memory MCP transport
- llms.txt for AI agent discoverability
- MIT license

### Fixed
- Externalized `express` from ESM bundle to avoid CJS `require()` incompatibility in ESM output
- Removed duplicate shebang line from built output
