import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server.js';

// Registry sandboxes (Glama, Smithery, Docker) start the server without a wallet
// to introspect it. Discovery must work keyless; paid calls must fail clearly.
describe('keyless startup', () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer({});
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test', version: '1.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  it('lists the same tools, resources and prompts as a keyed server', async () => {
    const keyed = createServer({
      privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
    });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const keyedClient = new Client({ name: 'test', version: '1.0.0' });
    await Promise.all([keyed.connect(st), keyedClient.connect(ct)]);

    const names = async (c: Client) => ({
      tools: (await c.listTools()).tools.map(t => t.name).sort(),
      resources: (await c.listResources()).resources.map(r => r.uri).sort(),
      prompts: (await c.listPrompts()).prompts.map(p => p.name).sort(),
    });
    const keyless = await names(client);
    expect(keyless.tools.length).toBeGreaterThan(0);
    expect(keyless).toEqual(await names(keyedClient));
  });

  it('fails a paid tool call with setup instructions instead of crashing', async () => {
    const result = await client.callTool({ name: 'fetch_url', arguments: { url: 'https://example.com' } });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('CLAWFETCH_PRIVATE_KEY');
  });

  it('fails wallet_info with setup instructions', async () => {
    const result = await client.callTool({ name: 'wallet_info', arguments: {} });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('CLAWFETCH_PRIVATE_KEY');
  });
});
