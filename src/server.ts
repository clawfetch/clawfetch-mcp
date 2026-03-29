import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ClawFetch, type ClawFetchOptions } from '@clawfetch/sdk';

import { registerFetchTools } from './tools/fetch.js';
import { registerResearchTools } from './tools/research.js';
import { registerDomainTools } from './tools/domains.js';
import { registerExtractTools } from './tools/extract.js';
import { registerUtilityTools } from './tools/utility.js';

export interface ClawFetchMcpConfig {
  /** Ethereum private key for x402 payments */
  privateKey: `0x${string}`;
  /** Base URL override (default: https://api.clawfetch.ai) */
  baseUrl?: string;
  /** Request timeout in ms (default: 60000 for MCP context) */
  timeoutMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export function createServer(config: ClawFetchMcpConfig): McpServer {
  const client = new ClawFetch({
    privateKey: config.privateKey,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs ?? 60_000,
    debug: config.debug,
  });

  const server = new McpServer({
    name: 'clawfetch',
    version: '0.1.0',
  });

  registerFetchTools(server, client);
  registerResearchTools(server, client);
  registerDomainTools(server, client);
  registerExtractTools(server, client);
  registerUtilityTools(server, client);

  return server;
}
