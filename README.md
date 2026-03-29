# @clawfetch/mcp

MCP (Model Context Protocol) server for [ClawFetch](https://clawfetch.ai) — Web Intelligence API for AI Agents.

Gives any MCP-compatible client (Claude Desktop, Cursor, Windsurf, OpenClaw, etc.) instant access to ClawFetch's web intelligence tools: fetch pages as markdown, render JS-heavy SPAs, extract structured data from 17+ site types, research topics multi-source, and check domain availability.

Payments are handled automatically via the [x402 protocol](https://www.x402.org/) — USDC on Base. No API keys, no billing dashboards.

## Quick Start

### Install

```bash
npm install -g @clawfetch/mcp
```

### Configure

Add to your MCP client config (e.g., Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "clawfetch": {
      "command": "clawfetch-mcp",
      "env": {
        "CLAWFETCH_PRIVATE_KEY": "0xYOUR_ETHEREUM_PRIVATE_KEY"
      }
    }
  }
}
```

The private key is used to sign x402 micropayments (USDC on Base). Fund the corresponding address with USDC on Base mainnet.

### Run Standalone (stdio)

```bash
CLAWFETCH_PRIVATE_KEY=0x... clawfetch-mcp
```

### Run as HTTP Server

```bash
CLAWFETCH_PRIVATE_KEY=0x... CLAWFETCH_TRANSPORT=http CLAWFETCH_PORT=3001 clawfetch-mcp
```

## Tools

| Tool | Description | Cost |
|------|-------------|------|
| `fetch_url` | Fetch any URL as clean markdown | $0.001 |
| `render_page` | Render JS-heavy pages (SPAs, React apps) | $0.002 |
| `extract_data` | Extract structured data from 17+ site types | $0.003 |
| `research_topic` | Multi-source research with citations | $0.01 |
| `check_domains` | Check domain name availability | $0.002 |
| `suggest_domains` | Generate available domain suggestions | $0.002 |
| `list_extractors` | List supported structured data extractors | $0.001 |
| `health_check` | Check API health status | Free |
| `wallet_info` | Show payment wallet address | Free |

### Supported Extractors

GitHub repos/profiles, npm packages, PyPI packages, Twitter/X profiles, LinkedIn profiles/companies, YouTube videos/channels, Product Hunt, Hacker News, Reddit, Crunchbase, Wikipedia, and more.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAWFETCH_PRIVATE_KEY` | Yes | — | Ethereum private key (0x-prefixed) for x402 payments |
| `CLAWFETCH_BASE_URL` | No | `https://api.clawfetch.ai` | API base URL |
| `CLAWFETCH_TRANSPORT` | No | `stdio` | Transport: `stdio` or `http` |
| `CLAWFETCH_HOST` | No | `0.0.0.0` | HTTP server bind address |
| `CLAWFETCH_PORT` | No | `3001` | HTTP server port |
| `CLAWFETCH_TIMEOUT_MS` | No | `60000` | Request timeout in ms |
| `CLAWFETCH_DEBUG` | No | `false` | Enable debug logging (`1` or `true`) |

## Development

```bash
git clone https://github.com/clawfetch/clawfetch-mcp.git
cd clawfetch-mcp
npm install
npm run build
npm test
```

## License

MIT
