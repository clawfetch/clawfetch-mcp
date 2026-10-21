import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ClawFetch, type ClawFetchOptions } from '@clawfetch/sdk';

import { registerFetchTools } from './tools/fetch.js';
import { registerResearchTools } from './tools/research.js';
import { registerDomainTools } from './tools/domains.js';
import { registerExtractTools } from './tools/extract.js';
import { registerParseTools } from './tools/parse.js';
import { registerCompanyTools } from './tools/company.js';
import { registerUtilityTools } from './tools/utility.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export interface ClawFetchMcpConfig {
  /** Ethereum private key for x402 payments. Optional: without it the server
   *  still lists tools/resources/prompts (registry sandboxes), and calls fail
   *  with setup instructions. */
  privateKey?: `0x${string}`;
  /** Base URL override (default: https://api.clawfetch.ai) */
  baseUrl?: string;
  /** Request timeout in ms (default: 60000 for MCP context) */
  timeoutMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export const MISSING_KEY_MESSAGE =
  'CLAWFETCH_PRIVATE_KEY is not set. Set it to the 0x-prefixed private key of a ' +
  'wallet holding USDC on Base to pay for ClawFetch calls via x402.';

// Throws the setup message on any use, so tools report it through their normal error path.
function keylessClient(): ClawFetch {
  return new Proxy({} as ClawFetch, {
    get() {
      throw new Error(MISSING_KEY_MESSAGE);
    },
  });
}

export function createServer(config: ClawFetchMcpConfig): McpServer {
  const client = config.privateKey
    ? new ClawFetch({
        privateKey: config.privateKey,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs ?? 60_000,
        debug: config.debug,
      })
    : keylessClient();

  const server = new McpServer({
    name: 'clawfetch',
    version: '0.4.0',
  });

  // Tools
  registerFetchTools(server, client);
  registerResearchTools(server, client);
  registerDomainTools(server, client);
  registerExtractTools(server, client);
  registerParseTools(server, client);
  registerCompanyTools(server, client);
  registerUtilityTools(server, client);

  // Resources (pricing, extractors, wallet, usage)
  registerResources(server, client);

  // Prompt templates (research, competitive analysis, domain hunting, site audit)
  registerPrompts(server);

  return server;
}
