import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClawFetch } from '@clawfetch/sdk';

export function registerParseTools(server: McpServer, client: ClawFetch) {
  server.tool(
    'parse_document',
    'Parse an office document (docx, pptx, xlsx, pdf, odt, ods, odp, rtf, epub, csv, doc, ppt) into clean GitHub-Flavored Markdown. Provide a document URL or a local file path. Deterministic Rust converter — headings, tables, and lists preserved. No OCR: scanned/image-only PDFs are rejected. Cost: $0.002 per request.',
    {
      url: z.string().url().optional().describe('URL of the document to download and parse (e.g. "https://example.com/report.docx")'),
      path: z.string().optional().describe('Local file path of the document to parse (read and uploaded as bytes)'),
      format: z.string().optional().describe('Optional explicit format override (e.g. "csv"). Auto-detected from bytes/extension when omitted.'),
    },
    async ({ url, path: filePath, format }) => {
      try {
        if (!url && !filePath) {
          return { content: [{ type: 'text' as const, text: 'Error: provide either "url" or "path".' }], isError: true };
        }
        let result;
        if (url) {
          result = await client.parse(url, { format });
        } else {
          const bytes = new Uint8Array(await readFile(filePath!));
          const filename = filePath!.split('/').pop();
          result = await client.parse(bytes, { filename, format });
        }
        const header = `## Parsed Document (${result.format}, ${result.chars} chars)\n`;
        return { content: [{ type: 'text' as const, text: `${header}\n${result.markdown}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
