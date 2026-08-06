import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClawFetch } from '@clawfetch/sdk';

export function registerResearchTools(server: McpServer, client: ClawFetch) {
  server.tool(
    'research_topic',
    'Research a topic using multiple sources. Returns a summary with cited sources. Great for market research, competitive analysis, fact-checking, and current events. Cost: $0.02 per request.',
    {
      topic: z.string().describe('The topic or question to research (e.g., "latest developments in AI agent frameworks")'),
      sources: z.number().min(1).max(10).optional().describe('Number of sources to consult (default: 5, max: 10)'),
    },
    async ({ topic, sources }) => {
      try {
        // The API takes `maxResults`; `sources` is the friendlier tool-facing
        // name. There is no server-side `depth` parameter — it was silently
        // ignored, so it is no longer advertised.
        const result = await client.research(topic, { maxResults: sources });
        const parts: string[] = [
          `## Research: ${result.topic ?? topic}\n`,
          result.summary,
          '\n### Sources\n',
        ];

        for (const src of result.sources) {
          const title = src.title || src.url;
          parts.push(`- [${title}](${src.url})`);
          if (src.snippet) parts.push(`  > ${src.snippet}`);
        }

        if (result.cached) parts.push('\n_[cached result]_');

        return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
