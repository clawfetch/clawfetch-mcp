import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClawFetch } from '@clawfetch/sdk';

export function registerDomainTools(server: McpServer, client: ClawFetch) {
  server.tool(
    'check_domains',
    'Check if one or more domain names are available for registration. Cost: $0.003 per request.',
    {
      domains: z.array(z.string()).min(1).max(20).describe('Array of domain names to check (e.g., ["example.com", "myapp.io"])'),
    },
    async ({ domains }) => {
      try {
        const result = await client.domainsCheck(domains);
        const lines: string[] = ['## Domain Availability\n'];
        for (const d of result.domains) {
          const icon = d.available === null ? '❔' : d.available ? '✅' : '❌';
          const status = d.available === null ? 'Unknown' : d.available ? 'Available' : 'Taken';
          lines.push(`${icon} **${d.domain}** — ${status}${d.error ? ` (${d.error})` : ''}`);
        }
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'suggest_domains',
    'Generate available domain name suggestions based on a keyword or concept. Cost: $0.003 per request.',
    {
      query: z.string().describe('Keyword or concept to generate domain suggestions for (e.g., "ai agent marketplace")'),
      tlds: z.array(z.string()).optional().describe('Preferred TLDs to check (e.g., [".com", ".io", ".ai"]). Default: common TLDs.'),
      maxCheck: z.number().int().min(1).max(50).optional().describe('Maximum candidate domains to check (default: 30, max: 50)'),
    },
    async ({ query, tlds, maxCheck }) => {
      try {
        const result = await client.domainsSuggest(query, { tlds, maxCheck });
        const lines: string[] = [
          `## Domain Suggestions for "${result.query}"\n`,
          `Checked ${result.checked} of ${result.generated} generated candidates.\n`,
        ];
        for (const s of result.suggestions) {
          if (s.available === null) lines.push(`❔ ${s.domain} — unknown${s.error ? ` (${s.error})` : ''}`);
          else lines.push(`${s.available ? '✅' : '❌'} ${s.domain}`);
        }
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
