import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClawFetch } from '@clawfetch/sdk';

/** Per-session usage tracking */
interface UsageStats {
  requestCount: number;
  totalCostUsd: number;
  byEndpoint: Record<string, { count: number; costUsd: number }>;
  sessionStartedAt: string;
}

/** Endpoint pricing table (USD per request) */
const ENDPOINT_PRICING: Record<string, { cost: number; description: string; method: string }> = {
  '/fetch': { cost: 0.001, description: 'Fetch URL as clean markdown/text', method: 'POST' },
  '/render': { cost: 0.005, description: 'JS-render page with stealth browser', method: 'POST' },
  '/extract': { cost: 0.008, description: 'Extract structured data from supported sites', method: 'POST' },
  '/research': { cost: 0.02, description: 'Multi-source topic research', method: 'POST' },
  '/domains/check': { cost: 0.003, description: 'Check domain availability', method: 'POST' },
  '/domains/suggest': { cost: 0.003, description: 'Generate & check domain suggestions', method: 'POST' },
  '/parse': { cost: 0.005, description: 'Parse office documents to markdown', method: 'POST' },
  '/extractors': { cost: 0.001, description: 'List available structured data extractors', method: 'GET' },
  '/health': { cost: 0, description: 'API health check (free)', method: 'GET' },
};

export function registerResources(server: McpServer, client: ClawFetch): UsageStats {
  const usage: UsageStats = {
    requestCount: 0,
    totalCostUsd: 0,
    byEndpoint: {},
    sessionStartedAt: new Date().toISOString(),
  };

  // ─── clawfetch://pricing ─────────────────────────────────────
  server.resource(
    'pricing',
    'clawfetch://pricing',
    { description: 'ClawFetch API endpoint pricing (USD per request, paid via x402/USDC on Base)' },
    async () => {
      const rows = Object.entries(ENDPOINT_PRICING)
        .map(([path, info]) => `| ${path} | $${info.cost.toFixed(3)} | ${info.method} | ${info.description} |`)
        .join('\n');

      const text =
        `# ClawFetch API Pricing\n\n` +
        `All payments are automatic via the x402 protocol using USDC on Base.\n\n` +
        `| Endpoint | Cost (USD) | Method | Description |\n` +
        `|----------|-----------|--------|-------------|\n` +
        `${rows}\n\n` +
        `**Payment flow:** Request → 402 response with price → SDK auto-signs EIP-3009 USDC authorization → retry with payment header → content returned.\n\n` +
        `**Wallet funding:** Send USDC on Base to your configured wallet address. Check balance with the \`wallet_info\` tool.`;

      return {
        contents: [{
          uri: 'clawfetch://pricing',
          mimeType: 'text/markdown',
          text,
        }],
      };
    },
  );

  // ─── clawfetch://extractors ──────────────────────────────────
  server.resource(
    'extractors',
    'clawfetch://extractors',
    { description: 'List of supported structured data extractors with domains and output fields' },
    async () => {
      try {
        const extractors = await client.extractors();

        const sections = extractors.map(e =>
          `### ${e.name}\n` +
          `**Domains:** ${e.domains.join(', ')}\n` +
          `**Description:** ${e.description}\n` +
          `**Fields:** ${e.fields.join(', ')}\n`
        ).join('\n');

        const text =
          `# ClawFetch Structured Data Extractors\n\n` +
          `${extractors.length} extractors available. Use the \`extract_data\` tool with a URL from a supported domain.\n` +
          `Cost: $0.008 per extraction.\n\n` +
          `${sections}`;

        return {
          contents: [{
            uri: 'clawfetch://extractors',
            mimeType: 'text/markdown',
            text,
          }],
        };
      } catch (err) {
        return {
          contents: [{
            uri: 'clawfetch://extractors',
            mimeType: 'text/plain',
            text: `Error fetching extractors: ${(err as Error).message}`,
          }],
        };
      }
    },
  );

  // ─── clawfetch://wallet ──────────────────────────────────────
  server.resource(
    'wallet',
    'clawfetch://wallet',
    { description: 'Wallet address used for x402 payments (USDC on Base)' },
    async () => {
      const address = client.walletAddress;

      const text =
        `# ClawFetch Payment Wallet\n\n` +
        `**Address:** \`${address}\`\n` +
        `**Network:** Base (Chain ID 8453)\n` +
        `**Token:** USDC\n` +
        `**Protocol:** x402 (EIP-3009 authorization)\n\n` +
        `**Check balance:** https://basescan.org/address/${address}\n\n` +
        `To fund this wallet, send USDC on Base to the address above.`;

      return {
        contents: [{
          uri: 'clawfetch://wallet',
          mimeType: 'text/markdown',
          text,
        }],
      };
    },
  );

  // ─── clawfetch://usage ───────────────────────────────────────
  server.resource(
    'usage',
    'clawfetch://usage',
    { description: 'Session usage statistics — requests made and estimated cost' },
    async () => {
      const endpointRows = Object.entries(usage.byEndpoint)
        .sort((a, b) => b[1].costUsd - a[1].costUsd)
        .map(([endpoint, stats]) =>
          `| ${endpoint} | ${stats.count} | $${stats.costUsd.toFixed(4)} |`
        )
        .join('\n');

      const text =
        `# ClawFetch Session Usage\n\n` +
        `**Session started:** ${usage.sessionStartedAt}\n` +
        `**Total requests:** ${usage.requestCount}\n` +
        `**Estimated cost:** $${usage.totalCostUsd.toFixed(4)}\n\n` +
        (endpointRows
          ? `| Endpoint | Requests | Cost |\n|----------|----------|------|\n${endpointRows}\n`
          : `_No requests made yet in this session._\n`);

      return {
        contents: [{
          uri: 'clawfetch://usage',
          mimeType: 'text/markdown',
          text,
        }],
      };
    },
  );

  return usage;
}

/** Record a request for usage tracking */
export function trackRequest(usage: UsageStats, endpoint: string): void {
  const pricing = ENDPOINT_PRICING[endpoint];
  const cost = pricing?.cost ?? 0;

  usage.requestCount++;
  usage.totalCostUsd += cost;

  if (!usage.byEndpoint[endpoint]) {
    usage.byEndpoint[endpoint] = { count: 0, costUsd: 0 };
  }
  usage.byEndpoint[endpoint].count++;
  usage.byEndpoint[endpoint].costUsd += cost;
}

export { ENDPOINT_PRICING };
