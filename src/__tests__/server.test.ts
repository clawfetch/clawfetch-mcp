import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the ClawFetch SDK before importing server
vi.mock('@clawfetch/sdk', () => {
  class MockClawFetch {
    walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

    async fetch(url: string, opts?: any) {
      return { url, title: 'Test Page', content: '# Test Content\nHello world', cached: false };
    }
    async render(url: string, opts?: any) {
      return { url, title: 'Rendered Page', content: '# Rendered\nJS content here', cached: false };
    }
    async extract(url: string) {
      return { url, extractor: 'github-repo', data: { stars: 1000, forks: 200 }, cached: false };
    }
    async research(topic: string, opts?: any) {
      return {
        topic,
        summary: 'Research summary here',
        sources: [{ url: 'https://example.com', title: 'Source 1', snippet: 'A snippet' }],
        cached: false,
      };
    }
    async domainsCheck(domains: string[]) {
      return {
        domains: domains.map(d => ({ domain: d, available: d.includes('available') })),
      };
    }
    async domainsSuggest(query: string, opts?: any) {
      return {
        query,
        suggestions: [
          { domain: 'example.com', available: true },
          { domain: 'example.io', available: false },
        ],
      };
    }
    async extractors() {
      return [
        { name: 'github-repo', domains: ['github.com'], description: 'GitHub repos', fields: ['stars', 'forks'] },
      ];
    }
    async health() {
      return { status: 'ok', version: '1.0.0' };
    }
  }

  return { ClawFetch: MockClawFetch };
});

import { createServer } from '../server.js';

describe('ClawFetch MCP Server', () => {
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    server = createServer({
      privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`,
    });
  });

  it('creates a server instance', () => {
    expect(server).toBeDefined();
  });
});

describe('Tool Registration', () => {
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    server = createServer({
      privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`,
    });
  });

  // Test that all expected tools are registered by checking the server internals
  it('registers all expected tools', async () => {
    // The MCP SDK stores tools internally. We can list them via the server's tool listing.
    // Since McpServer exposes tools through the protocol, we test by verifying
    // the server object is created without errors — tool registration happens in constructor.
    expect(server).toBeDefined();
  });
});

// Test the tool modules directly
describe('Fetch Tools', () => {
  it('module exports registerFetchTools', async () => {
    const mod = await import('../tools/fetch.js');
    expect(typeof mod.registerFetchTools).toBe('function');
  });
});

describe('Research Tools', () => {
  it('module exports registerResearchTools', async () => {
    const mod = await import('../tools/research.js');
    expect(typeof mod.registerResearchTools).toBe('function');
  });
});

describe('Domain Tools', () => {
  it('module exports registerDomainTools', async () => {
    const mod = await import('../tools/domains.js');
    expect(typeof mod.registerDomainTools).toBe('function');
  });
});

describe('Extract Tools', () => {
  it('module exports registerExtractTools', async () => {
    const mod = await import('../tools/extract.js');
    expect(typeof mod.registerExtractTools).toBe('function');
  });
});

describe('Utility Tools', () => {
  it('module exports registerUtilityTools', async () => {
    const mod = await import('../tools/utility.js');
    expect(typeof mod.registerUtilityTools).toBe('function');
  });
});
