import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClawFetch } from '@clawfetch/sdk';

export function registerUtilityTools(server: McpServer, client: ClawFetch) {
  server.tool(
    'health_check',
    'Check the ClawFetch API health status. Free — no x402 payment required.',
    {},
    async () => {
      try {
        const result = await client.health();
        return {
          content: [{
            type: 'text' as const,
            text: `ClawFetch API Status: ${result.status ?? 'ok'}\n\n` +
              '```json\n' + JSON.stringify(result, null, 2) + '\n```',
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'wallet_info',
    'Get the wallet address being used for x402 payments. Useful for checking balance or funding the wallet.',
    {},
    async () => {
      return {
        content: [{
          type: 'text' as const,
          text: `**Wallet Address:** ${client.walletAddress}\n**Network:** Base (EIP-155:8453)\n**Payment:** USDC via x402 protocol\n\nCheck balance at: https://basescan.org/address/${client.walletAddress}`,
        }],
      };
    },
  );
}
