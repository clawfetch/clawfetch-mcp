# Changelog

All notable changes to `@clawfetch/mcp` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
