# @clawfetch/mcp

MCP (Model Context Protocol) server for [ClawFetch](https://clawfetch.ai) — Web Intelligence API for AI Agents.

Gives any MCP-compatible client (Claude Desktop, Cursor, Windsurf, OpenClaw, etc.) instant access to ClawFetch's web intelligence tools: fetch pages as markdown, render JS-heavy SPAs, extract structured data from 17+ site types, research topics multi-source, and check domain availability.

Payments are handled automatically via the [x402 protocol](https://www.x402.org/) — USDC on Base. No API keys, no billing dashboards.

## Access and payment

The public hosted MCP endpoint is retired and returns HTTP 410 Gone. Run the MCP locally using the setup below, or call https://api.clawfetch.ai directly. Paid tool calls use your own USDC-funded wallet on Base; ClawFetch does not subsidize requests.

## 💻 Self-Hosted Mode

Run your own instance with full control over the payment wallet.

### Install

```bash
npm install -g @clawfetch/mcp
```

### Configure (stdio — for local MCP clients)

Add to your MCP client config (e.g., Claude Desktop):

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

The private key signs x402 micropayments (USDC on Base). Fund the corresponding address with USDC on Base mainnet.

### Run as HTTP Server

Expose the MCP server over HTTP for remote clients:

```bash
CLAWFETCH_PRIVATE_KEY=0x... CLAWFETCH_TRANSPORT=http CLAWFETCH_PORT=3001 clawfetch-mcp
```

This starts a server at `http://localhost:3001/mcp` using the Streamable HTTP transport (MCP spec compliant).

#### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST | Initialize session — returns `Mcp-Session-Id` header |
| `/mcp` | GET | SSE stream for server-to-client notifications (requires session ID) |
| `/mcp` | DELETE | Close a session |
| `/health` | GET | Server health check (JSON) |

#### Session Flow

1. **Initialize:** `POST /mcp` with JSON-RPC `initialize` request → get `Mcp-Session-Id` header
2. **Call tools:** `POST /mcp` with `Mcp-Session-Id` header + JSON-RPC `tools/call` request
3. **Stream:** `GET /mcp?sessionId=...` for SSE notifications (optional)
4. **Close:** `DELETE /mcp` with `Mcp-Session-Id` header

## Tools

| Tool | Description | Cost |
|------|-------------|------|
| `fetch_url` | Fetch any URL as clean markdown | $0.001 |
| `render_page` | Render JS-heavy pages (SPAs, React apps) | $0.005 |
| `extract_data` | Extract structured data from 17+ site types | $0.008 |
| `research_topic` | Multi-source research with citations | $0.02 |
| `check_domains` | Check domain name availability | $0.008 |
| `suggest_domains` | Generate available domain suggestions | $0.008 |
| `parse_document` | Parse office docs (docx/pptx/xlsx/pdf/…) to markdown | $0.005 |
| `list_extractors` | List supported structured data extractors | $0.001 |
| `health_check` | Check API health status | Free |
| `wallet_info` | Show payment wallet address | Free |

### Supported Extractors

GitHub repos/profiles, npm packages, PyPI packages, Twitter/X profiles, LinkedIn profiles/companies, YouTube videos/channels, Product Hunt, Hacker News, Reddit, Crunchbase, Wikipedia, and more.

Use `list_extractors` to see all available types with their schema.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAWFETCH_PRIVATE_KEY` | Yes* | — | Ethereum private key (0x-prefixed) for x402 payments |
| `CLAWFETCH_BASE_URL` | No | `https://api.clawfetch.ai` | API base URL |
| `CLAWFETCH_TRANSPORT` | No | `stdio` | Transport: `stdio` or `http` |
| `CLAWFETCH_HOST` | No | `0.0.0.0` | HTTP server bind address |
| `CLAWFETCH_PORT` | No | `3001` | HTTP server port |
| `CLAWFETCH_TIMEOUT_MS` | No | `60000` | Request timeout in ms |
| `CLAWFETCH_DEBUG` | No | `false` | Enable debug logging (`1` or `true`) |

\* Required. Keep this key in your local configuration; never submit it to the ClawFetch website.

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
