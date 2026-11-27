import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { request } from 'node:http';
import { allowedHostsFromEnv, hostGuard, bearerAuth, remoteBindProblem } from '../http-security.js';

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

describe('remoteBindProblem (operator-wallet exposure)', () => {
  it('allows loopback binds without a token', () => {
    expect(remoteBindProblem('127.0.0.1', undefined)).toBeNull();
    expect(remoteBindProblem('localhost', undefined)).toBeNull();
    expect(remoteBindProblem('::1', undefined)).toBeNull();
  });

  it('refuses a remote bind without a token', () => {
    expect(remoteBindProblem('0.0.0.0', undefined)).toMatch(/CLAWFETCH_AUTH_TOKEN/);
    expect(remoteBindProblem('::', undefined)).toMatch(/CLAWFETCH_AUTH_TOKEN/);
    expect(remoteBindProblem('10.0.0.5', '')).toMatch(/CLAWFETCH_AUTH_TOKEN/);
  });

  it('allows a remote bind once a token is set', () => {
    expect(remoteBindProblem('0.0.0.0', 's3cret')).toBeNull();
  });
});

describe('bearerAuth (remote callers must authenticate before the wallet pays)', () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  async function start(token: string | undefined): Promise<number> {
    const app = express();
    app.use('/mcp', bearerAuth(token));
    app.post('/mcp', (_req, res) => { res.json({ ok: true }); });
    app.get('/health', (_req, res) => { res.json({ ok: true }); });
    return new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve((server!.address() as { port: number }).port));
    });
  }

  function post(port: number, path: string, authorization?: string): Promise<{ status: number; wwwAuth?: string }> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = { 'content-type': 'application/json', 'content-length': '2' };
      if (authorization) headers.authorization = authorization;
      const req = request({ host: '127.0.0.1', port, path, method: path === '/health' ? 'GET' : 'POST', headers }, (res) => {
        res.resume();
        resolve({ status: res.statusCode ?? 0, wwwAuth: res.headers['www-authenticate'] as string | undefined });
      });
      req.on('error', reject);
      req.end('{}');
    });
  }

  it('passes everything through when no token is configured (loopback-only mode)', async () => {
    const port = await start(undefined);
    expect((await post(port, '/mcp')).status).toBe(200);
  });

  it('rejects a missing, malformed or wrong bearer with 401 + WWW-Authenticate', async () => {
    const port = await start('correct-horse');
    const missing = await post(port, '/mcp');
    expect(missing.status).toBe(401);
    expect(missing.wwwAuth).toMatch(/^Bearer/);
    expect((await post(port, '/mcp', 'Basic abc')).status).toBe(401);
    expect((await post(port, '/mcp', 'Bearer wrong')).status).toBe(401);
    expect((await post(port, '/mcp', 'Bearer correct-horse-battery')).status).toBe(401);
  });

  it('accepts the configured bearer (scheme case-insensitive)', async () => {
    const port = await start('correct-horse');
    expect((await post(port, '/mcp', 'Bearer correct-horse')).status).toBe(200);
    expect((await post(port, '/mcp', 'bearer correct-horse')).status).toBe(200);
  });

  it('leaves /health open', async () => {
    const port = await start('correct-horse');
    expect((await post(port, '/health')).status).toBe(200);
  });
});
