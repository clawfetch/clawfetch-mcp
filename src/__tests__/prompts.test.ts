import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Mock the ClawFetch SDK
vi.mock('@clawfetch/sdk', () => {
  class MockClawFetch {
    walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
    async extractors() { return []; }
    async health() { return { status: 'ok' }; }
    async fetch() { return { url: '', content: '', cached: false }; }
    async render() { return { url: '', content: '', cached: false }; }
    async extract() { return { url: '', extractor: '', data: {}, cached: false }; }
    async research() { return { topic: '', summary: '', sources: [], cached: false }; }
    async domainsCheck() { return { domains: [] }; }
    async domainsSuggest() { return { query: '', suggestions: [] }; }
  }
  return { ClawFetch: MockClawFetch };
});

import { createServer } from '../server.js';

describe('MCP Prompt Integration Tests', () => {
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

  it('lists all registered prompts', async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map(p => p.name).sort();

    expect(names).toEqual([
      'competitive-analysis',
      'domain-hunting',
      'research-topic',
      'site-audit',
    ]);
  });

  it('prompts have descriptions', async () => {
    const { prompts } = await client.listPrompts();
    for (const prompt of prompts) {
      expect(prompt.description).toBeTruthy();
      expect(prompt.description!.length).toBeGreaterThan(20);
    }
  });

  describe('research-topic', () => {
    it('returns workflow with topic injected', async () => {
      const result = await client.getPrompt({
        name: 'research-topic',
        arguments: { topic: 'x402 protocol' },
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');

      const text = (result.messages[0].content as any).text;
      expect(text).toContain('x402 protocol');
      expect(text).toContain('research_topic');
      expect(text).toContain('fetch_url');
      expect(text).toContain('extract_data');
      expect(text).toContain('Estimated cost');
    });
  });

  describe('competitive-analysis', () => {
    it('returns workflow with subject and competitors', async () => {
      const result = await client.getPrompt({
        name: 'competitive-analysis',
        arguments: { subject: 'ClawFetch', competitors: 'Firecrawl, Jina Reader' },
      });

      const text = (result.messages[0].content as any).text;
      expect(text).toContain('ClawFetch');
      expect(text).toContain('Firecrawl, Jina Reader');
      expect(text).toContain('comparison matrix');
      expect(text).toContain('strategic recommendations');
    });
  });

  describe('domain-hunting', () => {
    it('returns workflow with concept', async () => {
      const result = await client.getPrompt({
        name: 'domain-hunting',
        arguments: { concept: 'AI agent marketplace' },
      });

      const text = (result.messages[0].content as any).text;
      expect(text).toContain('AI agent marketplace');
      expect(text).toContain('suggest_domains');
      expect(text).toContain('check_domains');
      expect(text).toContain('Top picks');
    });

    it('uses custom TLDs when provided', async () => {
      const result = await client.getPrompt({
        name: 'domain-hunting',
        arguments: { concept: 'myproject', tlds: '.xyz, .app, .net' },
      });

      const text = (result.messages[0].content as any).text;
      expect(text).toContain('.xyz, .app, .net');
    });

    it('uses default TLDs when not provided', async () => {
      const result = await client.getPrompt({
        name: 'domain-hunting',
        arguments: { concept: 'myproject' },
      });

      const text = (result.messages[0].content as any).text;
      expect(text).toContain('.com, .io, .ai, .dev');
    });
  });

  describe('site-audit', () => {
    it('returns workflow with target URL', async () => {
      const result = await client.getPrompt({
        name: 'site-audit',
        arguments: { url: 'https://clawfetch.ai' },
      });

      const text = (result.messages[0].content as any).text;
      expect(text).toContain('https://clawfetch.ai');
      expect(text).toContain('fetch_url');
      expect(text).toContain('render_page');
      expect(text).toContain('Content Quality');
      expect(text).toContain('SEO');
      expect(text).toContain('Recommendations');
    });
  });
});
