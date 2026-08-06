import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClawFetch } from '@clawfetch/sdk';

export function registerFetchTools(server: McpServer, client: ClawFetch) {
  server.tool(
    'fetch_url',
    'Fetch a URL and return its content as clean markdown. Works for articles, docs, blogs, product pages — any static HTML. Cost: $0.001 per request.',
    {
      url: z.string().url().describe('The URL to fetch'),
      maxChars: z.number().optional().describe('Maximum characters to return (default: no limit). Use to control response size.'),
    },
    async ({ url, maxChars }) => {
      try {
        const result = await client.fetch(url, { maxChars });
        const parts: string[] = [];
        if (result.title) parts.push(`# ${result.title}\n`);
        parts.push(result.content);
        if (result.cached) parts.push('\n_[cached result]_');
        return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'render_page',
    'Render a JavaScript-heavy page using a stealth browser and return clean markdown. Use for SPAs, React/Vue/Angular apps, pages behind JS rendering. Cost: $0.005 per request.',
    {
      url: z.string().url().describe('The URL to render'),
      maxChars: z.number().optional().describe('Maximum characters to return'),
      waitFor: z.string().optional().describe('CSS selector to wait for before extracting content (e.g., ".main-content", "#app")'),
    },
    async ({ url, maxChars, waitFor }) => {
      try {
        const result = await client.render(url, { maxChars, waitFor });
        const parts: string[] = [];
        if (result.title) parts.push(`# ${result.title}\n`);
        parts.push(result.content);
        if (result.cached) parts.push('\n_[cached result]_');
        return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
