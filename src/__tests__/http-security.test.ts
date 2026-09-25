import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { request } from 'node:http';
import { allowedHostsFromEnv, hostGuard } from '../http-security.js';

describe('allowedHostsFromEnv', () => {
  it('defaults to loopback names only', () => {
    expect(allowedHostsFromEnv(undefined)).toEqual(['localhost', '127.0.0.1', '[::1]']);
    expect(allowedHostsFromEnv('  ')).toEqual(['localhost', '127.0.0.1', '[::1]']);
  });

  it('parses a comma-separated override, trimming and lowercasing', () => {
    expect(allowedHostsFromEnv(' MCP.Example.com, 10.0.0.5 ,')).toEqual(['mcp.example.com', '10.0.0.5']);
  });
});

describe('hostGuard (DNS-rebinding protection)', () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  async function start(allowed: string[]): Promise<number> {
    const app = express();
    app.use(hostGuard(allowed));
    app.get('/health', (_req, res) => { res.json({ ok: true }); });
    return new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve((server!.address() as { port: number }).port));
    });
  }

  function get(port: number, host: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path: '/health', headers: { Host: host } }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('accepts an allowed Host regardless of port', async () => {
    const port = await start(['localhost', '127.0.0.1', '[::1]']);
    expect(await get(port, `localhost:${port}`)).toBe(200);
    expect(await get(port, `127.0.0.1:${port}`)).toBe(200);
  });

  it('rejects a rebinding attacker Host with 403', async () => {
    const port = await start(['localhost', '127.0.0.1', '[::1]']);
    expect(await get(port, `evil.example.com:${port}`)).toBe(403);
  });
});
