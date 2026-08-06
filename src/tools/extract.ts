import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClawFetch } from '@clawfetch/sdk';

export function registerExtractTools(server: McpServer, client: ClawFetch) {
  server.tool(
    'extract_data',
    'Extract structured data from a URL using a specialized extractor. Supports 17+ site types including GitHub repos/profiles, npm packages, Twitter/X profiles, LinkedIn, YouTube, Product Hunt, Hacker News, Reddit, and more. Cost: $0.008 per request.',
    {
      url: z.string().url().describe('The URL to extract data from (e.g., "https://github.com/openai/openai-python", "https://www.npmjs.com/package/express")'),
      type: z.string().optional().describe('Optional extractor override (e.g. "github", "coingecko"). Auto-detected from the URL when omitted.'),
    },
    async ({ url, type }) => {
      try {
        const result = await client.extract(url, { type });
        // The server returns the extractor name as `type`; older SDK typings
        // called it `extractor`. Accept either so the header is never blank.
        const used = (result as { type?: string }).type ?? result.extractor ?? 'auto';
        const parts: string[] = [
          `## Extracted Data (${used})\n`,
          `**Source:** ${result.url}\n`,
          '```json',
          JSON.stringify(result.data, null, 2),
          '```',
        ];
        if (result.cached) parts.push('\n_[cached result]_');
        return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'list_extractors',
    'List all available structured data extractors with their supported domains and fields. Use this to discover what sites ClawFetch can extract typed data from. Cost: $0.001.',
    {},
    async () => {
      try {
        const extractors = await client.extractors();
        const lines: string[] = ['## Available Extractors\n'];
        for (const ext of extractors) {
          lines.push(`### ${ext.name}`);
          lines.push(`${ext.description}`);
          lines.push(`**Domains:** ${ext.domains.join(', ')}`);
          lines.push(`**Fields:** ${ext.fields.join(', ')}`);
          lines.push('');
        }
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
