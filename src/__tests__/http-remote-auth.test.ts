/**
 * End-to-end: the built HTTP server must never sign an x402 payment with the
 * operator wallet for a caller that has not authenticated. Reproduces the
 * 2026-11-26 private report (Aeon Security): remote bind per the README
 * (CLAWFETCH_HOST=0.0.0.0 + public name in CLAWFETCH_ALLOWED_HOSTS), a plain
 * client sending only the allowlisted Host header, a local stand-in for
 * api.clawfetch.ai that answers 402 and records any PAYMENT-SIGNATURE.
 *
 * Needs dist/index.js (npm run build); skipped when it is absent.
 */
import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(here, '../../dist/index.js');
const built = fs.existsSync(entry);

// Anvil account #0: a public throwaway key, never funded on mainnet.
const OPERATOR_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const PUBLIC_HOST = 'mcp.example.com';
const TOKEN = 'test-token-7f3a';

type Payment = { payload?: { authorization?: { from?: string; value?: string } } };

function startUpstream(payments: Payment[]): Promise<http.Server> {
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const sig = req.headers['payment-signature'];
      if (!sig) {
        const pr = {
          x402Version: 2,
          resource: { url: `http://upstream${req.url}`, description: 'fetch', mimeType: 'application/json' },
          accepts: [{
            scheme: 'exact', network: 'eip155:8453', amount: '1000',
            asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', payTo: '0x000000000000000000000000000000000000dEaD',
            maxTimeoutSeconds: 60, extra: { name: 'USD Coin', version: '2' },
          }],
        };
        res.writeHead(402, { 'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(pr)).toString('base64'), 'content-type': 'application/json' });
        res.end('{}');
        return;
      }
      payments.push(JSON.parse(Buffer.from(String(sig), 'base64').toString()));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ title: 'ok', content: 'paid content' }));
    });
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = http.createServer();
    s.listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => resolve(p)); });
  });
}

type Rpc = { status: number; sid?: string; json: unknown };
function rpc(port: number, msg: object, opts: { sessionId?: string; bearer?: string } = {}): Promise<Rpc> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(msg);
    const headers: Record<string, string> = {
      Host: PUBLIC_HOST, 'content-type': 'application/json', accept: 'application/json, text/event-stream',
      'content-length': String(Buffer.byteLength(data)),
    };
    if (opts.sessionId) headers['mcp-session-id'] = opts.sessionId;
    if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
    const req = http.request({ host: '127.0.0.1', port, path: '/mcp', method: 'POST', headers }, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => {
        const line = b.split('\n').find((l) => l.startsWith('data:'));
        let json: unknown = null;
        try { json = JSON.parse(line ? line.slice(5) : b); } catch { /* non-JSON body */ }
        resolve({ status: res.statusCode ?? 0, sid: res.headers['mcp-session-id'] as string | undefined, json });
      });
    });
    req.on('error', reject);
    req.end(data);
  });
}

async function startServer(env: Record<string, string>): Promise<{ child: ChildProcess; stderr: () => string; exited: () => number | null }> {
  const child = spawn(process.execPath, [entry], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, ...env } });
  let stderr = '';
  child.stderr!.on('data', (c) => { stderr += c; });
  for (let i = 0; i < 200 && !stderr.includes('listening') && child.exitCode === null; i++) await delay(50);
  return { child, stderr: () => stderr, exited: () => child.exitCode };
}

describe.skipIf(!built)('remote HTTP mode cannot spend the operator wallet for unauthenticated callers', () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => { while (cleanups.length) cleanups.pop()!(); });

  it('refuses to start on a non-loopback bind without CLAWFETCH_AUTH_TOKEN', async () => {
    const port = await freePort();
    const s = await startServer({
      CLAWFETCH_TRANSPORT: 'http', CLAWFETCH_HOST: '0.0.0.0', CLAWFETCH_PORT: String(port),
      CLAWFETCH_ALLOWED_HOSTS: PUBLIC_HOST, CLAWFETCH_PRIVATE_KEY: OPERATOR_KEY, CLAWFETCH_AUTH_TOKEN: '',
    });
    cleanups.push(() => s.child.kill());
    for (let i = 0; i < 100 && s.exited() === null; i++) await delay(50);
    expect(s.exited()).toBe(1);
    expect(s.stderr()).toMatch(/CLAWFETCH_AUTH_TOKEN/);
    expect(s.stderr()).not.toMatch(/listening/);
  });

  it('with a token: unauthenticated caller gets 401 and no payment is signed; bearer caller is served', async () => {
    const payments: Payment[] = [];
    const upstream = await startUpstream(payments);
    cleanups.push(() => upstream.close());
    const port = await freePort();
    const s = await startServer({
      CLAWFETCH_TRANSPORT: 'http', CLAWFETCH_HOST: '0.0.0.0', CLAWFETCH_PORT: String(port),
      CLAWFETCH_ALLOWED_HOSTS: PUBLIC_HOST, CLAWFETCH_PRIVATE_KEY: OPERATOR_KEY, CLAWFETCH_AUTH_TOKEN: TOKEN,
      CLAWFETCH_BASE_URL: `http://127.0.0.1:${(upstream.address() as { port: number }).port}`,
    });
    cleanups.push(() => s.child.kill());
    expect(s.stderr()).toMatch(/listening/);

    const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'attacker', version: '1' } } };

    // Attacker: allowlisted Host header, no Authorization.
    const anon = await rpc(port, init);
    expect(anon.status).toBe(401);
    expect(anon.sid).toBeUndefined();
    expect(payments).toHaveLength(0);

    // Operator's own client: same request plus the bearer.
    const ok = await rpc(port, init, { bearer: TOKEN });
    expect(ok.status).toBe(200);
    expect(ok.sid).toBeTruthy();
    await rpc(port, { jsonrpc: '2.0', method: 'notifications/initialized' }, { sessionId: ok.sid, bearer: TOKEN });

    // Attacker cannot ride the operator's session id without the bearer either.
    const hijack = await rpc(port, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'fetch_url', arguments: { url: 'https://example.org/' } } }, { sessionId: ok.sid });
    expect(hijack.status).toBe(401);
    expect(payments).toHaveLength(0);

    const call = await rpc(port, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'fetch_url', arguments: { url: 'https://example.org/' } } }, { sessionId: ok.sid, bearer: TOKEN });
    expect(call.status).toBe(200);
    expect(JSON.stringify(call.json)).toContain('paid content');
    expect(payments).toHaveLength(1);
    expect(payments[0].payload?.authorization?.value).toBe('1000');
  });
});
