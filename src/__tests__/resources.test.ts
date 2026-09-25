import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Mock the ClawFetch SDK
vi.mock('@clawfetch/sdk', () => {
  class MockClawFetch {
    walletAddress = '0xABCDef1234567890abcdef1234567890ABCDEF12';

    async extractors() {
      return [
        { name: 'github-repo', domains: ['github.com'], description: 'Extract GitHub repo data', fields: ['stars', 'forks', 'language'] },
        { name: 'npm-package', domains: ['npmjs.com'], description: 'Extract npm package info', fields: ['downloads', 'version'] },
        { name: 'linkedin-profile', domains: ['linkedin.com'], description: 'Extract LinkedIn profile', fields: ['name', 'headline', 'company'] },
      ];
    }
    async health() {
      return { status: 'ok' };
    }
    async fetch() {
      return { url: '', content: '', cached: false };
    }
    async render() {
      return { url: '', content: '', cached: false };
    }
    async extract() {
      return { url: '', extractor: '', data: {}, cached: false };
    }
    async research() {
      return { topic: '', summary: '', sources: [], cached: false };
    }
    async domainsCheck() {
      return { domains: [] };
    }
    async domainsSuggest() {
      return { query: '', suggestions: [] };
    }
  }
  return { ClawFetch: MockClawFetch };
});

import { createServer } from '../server.js';

describe('MCP Resource Integration Tests', () => {
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

  it('lists all registered resources', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map(r => r.uri).sort();

    expect(uris).toEqual([
      'clawfetch://extractors',
      'clawfetch://pricing',
      'clawfetch://usage',
      'clawfetch://wallet',
    ]);
  });

  describe('clawfetch://pricing', () => {
    it('returns endpoint pricing table', async () => {
      const result = await client.readResource({ uri: 'clawfetch://pricing' });
      const text = (result.contents[0] as any).text;

      expect(text).toContain('ClawFetch API Pricing');
      expect(text).toContain('/fetch');
      expect(text).toContain('/render');
      expect(text).toContain('/extract');
      expect(text).toContain('/research');
      expect(text).toContain('/domains/check');
      expect(text).toContain('/domains/suggest');
      expect(text).toContain('$0.001');
      expect(text).toContain('x402');
      expect(text).toContain('USDC');
    });

    it('matches the live API price sheet', async () => {
      const result = await client.readResource({ uri: 'clawfetch://pricing' });
      const text = (result.contents[0] as any).text;
      const live = {
        '/fetch': '$0.001', '/render': '$0.005', '/extract': '$0.008', '/research': '$0.020',
        '/domains/check': '$0.003', '/domains/suggest': '$0.003', '/parse': '$0.005', '/extractors': '$0.001',
      };
      for (const [path, price] of Object.entries(live)) expect(text).toContain(`| ${path} | ${price} |`);
    });

    it('advertises live prices in every paid tool description', async () => {
      const { tools } = await client.listTools();
      const live: Record<string, string> = {
        fetch_url: '$0.001', render_page: '$0.005', extract_data: '$0.008', research_topic: '$0.02',
        check_domains: '$0.003', suggest_domains: '$0.003', parse_document: '$0.005', list_extractors: '$0.001',
      };
      for (const [name, price] of Object.entries(live)) {
        expect(tools.find(t => t.name === name)?.description).toContain(`Cost: ${price}`);
      }
    });

    it('returns markdown mime type', async () => {
      const result = await client.readResource({ uri: 'clawfetch://pricing' });
      expect(result.contents[0].mimeType).toBe('text/markdown');
    });
  });

  describe('clawfetch://extractors', () => {
    it('lists extractors with fields and domains', async () => {
      const result = await client.readResource({ uri: 'clawfetch://extractors' });
      const text = (result.contents[0] as any).text;

      expect(text).toContain('Structured Data Extractors');
      expect(text).toContain('github-repo');
      expect(text).toContain('npm-package');
      expect(text).toContain('linkedin-profile');
      expect(text).toContain('github.com');
      expect(text).toContain('npmjs.com');
      expect(text).toContain('stars, forks, language');
      expect(text).toContain('3 extractors available');
    });
  });

  describe('clawfetch://wallet', () => {
    it('shows wallet address and network info', async () => {
      const result = await client.readResource({ uri: 'clawfetch://wallet' });
      const text = (result.contents[0] as any).text;

      expect(text).toContain('0xABCDef1234567890abcdef1234567890ABCDEF12');
      expect(text).toContain('Base');
      expect(text).toContain('8453');
      expect(text).toContain('USDC');
      expect(text).toContain('basescan.org');
    });
  });

  describe('clawfetch://usage', () => {
    it('shows empty usage at session start', async () => {
      const result = await client.readResource({ uri: 'clawfetch://usage' });
      const text = (result.contents[0] as any).text;

      expect(text).toContain('Session Usage');
      expect(text).toContain('**Total requests:** 0');
      expect(text).toContain('$0.0000');
      expect(text).toContain('No requests made yet');
    });
  });
});
