import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Mock the ClawFetch SDK
vi.mock('@clawfetch/sdk', () => {
  class MockClawFetch {
    walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

    async fetch(url: string, opts?: any) {
      return { url, title: 'Test Page', content: '# Hello\nWorld', cached: false };
    }
    async render(url: string, opts?: any) {
      return { url, title: 'Rendered', content: '# JS Content', cached: true };
    }
    async extract(url: string) {
      return { url, extractor: 'github-repo', data: { stars: 42000, language: 'TypeScript' }, cached: false };
    }
    async research(topic: string, opts?: any) {
      return {
        topic,
        summary: `Research about ${topic}`,
        sources: [
          { url: 'https://src1.com', title: 'Source One', snippet: 'First source' },
          { url: 'https://src2.com', title: 'Source Two' },
        ],
        cached: false,
      };
    }
    async domainsCheck(domains: string[]) {
      return { domains: domains.map(d => ({ domain: d, available: d === 'available.com' })) };
    }
    async domainsSuggest(query: string, opts?: any) {
      return {
        query,
        suggestions: [
          { domain: `${query}.com`, available: true },
          { domain: `${query}.io`, available: false },
        ],
      };
    }
    async extractors() {
      return [
        { name: 'github-repo', domains: ['github.com'], description: 'Extract GitHub repo data', fields: ['stars', 'forks', 'language'] },
        { name: 'npm-package', domains: ['npmjs.com'], description: 'Extract npm package info', fields: ['downloads', 'version'] },
      ];
    }
    async parse(source: any, opts?: any) {
      return { markdown: '# Parsed Doc\n\n| a | b |', format: opts?.format ?? 'docx', chars: 24 };
    }
    async health() {
      return { status: 'ok', version: '1.0.0' };
    }
  }

  return { ClawFetch: MockClawFetch };
});

import { createServer } from '../server.js';

describe('MCP Tool Integration Tests', () => {
  let client: Client;

  beforeEach(async () => {
    const server = createServer({
      privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`,
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: 'test-client', version: '1.0.0' });

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  it('lists all registered tools', async () => {
    const { tools } = await client.listTools();
    const toolNames = tools.map(t => t.name).sort();

    expect(toolNames).toEqual([
      'check_domains',
      'extract_data',
      'fetch_url',
      'health_check',
      'list_extractors',
      'parse_document',
      'render_page',
      'research_topic',
      'suggest_domains',
      'wallet_info',
    ]);
  });

  it('fetch_url returns content with title', async () => {
    const result = await client.callTool({ name: 'fetch_url', arguments: { url: 'https://example.com' } });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('# Test Page');
    expect(text).toContain('# Hello\nWorld');
    expect(result.isError).toBeFalsy();
  });

  it('render_page returns cached result marker', async () => {
    const result = await client.callTool({ name: 'render_page', arguments: { url: 'https://spa.example.com' } });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('# Rendered');
    expect(text).toContain('[cached result]');
  });

  it('research_topic returns summary with sources', async () => {
    const result = await client.callTool({ name: 'research_topic', arguments: { topic: 'AI agents' } });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('Research about AI agents');
    expect(text).toContain('Source One');
    expect(text).toContain('https://src1.com');
    expect(text).toContain('### Sources');
  });

  it('parse_document returns markdown from a URL', async () => {
    const result = await client.callTool({ name: 'parse_document', arguments: { url: 'https://example.com/report.docx' } });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('Parsed Document (docx, 24 chars)');
    expect(text).toContain('# Parsed Doc');
    expect(result.isError).toBeFalsy();
  });

  it('parse_document errors without url or path', async () => {
    const result = await client.callTool({ name: 'parse_document', arguments: {} });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('provide either "url" or "path"');
    expect(result.isError).toBe(true);
  });

  it('extract_data returns structured JSON', async () => {
    const result = await client.callTool({ name: 'extract_data', arguments: { url: 'https://github.com/test/repo' } });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('github-repo');
    expect(text).toContain('42000');
    expect(text).toContain('TypeScript');
  });

  it('list_extractors shows available extractors', async () => {
    const result = await client.callTool({ name: 'list_extractors', arguments: {} });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('github-repo');
    expect(text).toContain('npm-package');
    expect(text).toContain('npmjs.com');
  });

  it('check_domains shows availability status', async () => {
    const result = await client.callTool({
      name: 'check_domains',
      arguments: { domains: ['available.com', 'taken.com'] },
    });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('✅');
    expect(text).toContain('❌');
    expect(text).toContain('available.com');
    expect(text).toContain('taken.com');
  });

  it('suggest_domains generates suggestions', async () => {
    const result = await client.callTool({
      name: 'suggest_domains',
      arguments: { query: 'myproject' },
    });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('myproject.com');
    expect(text).toContain('myproject.io');
    expect(text).toContain('✅');
    expect(text).toContain('❌');
  });

  it('health_check returns API status', async () => {
    const result = await client.callTool({ name: 'health_check', arguments: {} });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('ok');
    expect(text).toContain('1.0.0');
  });

  it('wallet_info returns wallet address', async () => {
    const result = await client.callTool({ name: 'wallet_info', arguments: {} });
    const text = (result.content as any[])[0].text;

    expect(text).toContain('0x1234567890abcdef1234567890abcdef12345678');
    expect(text).toContain('Base');
    expect(text).toContain('basescan.org');
  });

  it('fetch_url with maxChars parameter', async () => {
    const result = await client.callTool({
      name: 'fetch_url',
      arguments: { url: 'https://example.com', maxChars: 500 },
    });
    expect(result.isError).toBeFalsy();
  });

  it('render_page with waitFor parameter', async () => {
    const result = await client.callTool({
      name: 'render_page',
      arguments: { url: 'https://spa.com', waitFor: '.main-content' },
    });
    expect(result.isError).toBeFalsy();
  });

  it('research_topic with all options', async () => {
    const result = await client.callTool({
      name: 'research_topic',
      arguments: { topic: 'blockchain', sources: 3, depth: 'deep' },
    });
    expect(result.isError).toBeFalsy();
  });
});
