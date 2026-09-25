#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { createServer } from './server.js';
import type { Hex } from 'viem';

const transport = process.env.CLAWFETCH_TRANSPORT ?? 'stdio';
const version = '0.3.2';

function getConfig() {
  const privateKey = process.env.CLAWFETCH_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: CLAWFETCH_PRIVATE_KEY environment variable is required.');
    console.error('Set it to your Ethereum private key (0x-prefixed hex) for x402 payments.');
    process.exit(1);
  }

  return {
    privateKey: privateKey as Hex,
    baseUrl: process.env.CLAWFETCH_BASE_URL,
    timeoutMs: process.env.CLAWFETCH_TIMEOUT_MS ? Number(process.env.CLAWFETCH_TIMEOUT_MS) : undefined,
    debug: process.env.CLAWFETCH_DEBUG === '1' || process.env.CLAWFETCH_DEBUG === 'true',
  };
}

if (transport === 'http') {
  const { randomUUID } = await import('node:crypto');
  const { StreamableHTTPServerTransport: StreamableTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );

  const express = (await import('express')).default;
  const { allowedHostsFromEnv, hostGuard } = await import('./http-security.js');

  const host = process.env.CLAWFETCH_HOST ?? '127.0.0.1';
  const port = Number(process.env.CLAWFETCH_PORT ?? '3001');
  const allowedHosts = allowedHostsFromEnv(process.env.CLAWFETCH_ALLOWED_HOSTS);

  const app = express();
  app.use(hostGuard(allowedHosts));
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const startedAt = new Date().toISOString();

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version,
      transport: 'http',
      uptime: process.uptime(),
      startedAt,
      activeSessions: transports.size,
      memoryMB: Math.round(process.memoryUsage.rss() / 1048576),
    });
  });

  app.all('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (req.method === 'GET') {
      // SSE stream for notifications
      if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({ error: 'Missing or invalid session ID' });
        return;
      }
      const t = transports.get(sessionId)!;
      await t.handleRequest(req, res);
      return;
    }

    if (req.method === 'POST') {
      if (sessionId && transports.has(sessionId)) {
        // Existing session
        const t = transports.get(sessionId)!;
        await t.handleRequest(req, res);
        return;
      }

      // New session
      const newSessionId = randomUUID();
      const config = getConfig();
      const server = createServer(config);
      const t = new StreamableTransport({ sessionIdGenerator: () => newSessionId });

      transports.set(newSessionId, t);
      t.onclose = () => transports.delete(newSessionId);

      await server.connect(t);
      await t.handleRequest(req, res);
      return;
    }

    if (req.method === 'DELETE') {
      if (sessionId && transports.has(sessionId)) {
        const t = transports.get(sessionId)!;
        await t.handleRequest(req, res);
        transports.delete(sessionId);
        return;
      }
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  });

  // @ts-ignore — Express listen(port, host, cb) works at runtime
  app.listen(port, host, () => {
    console.error(`ClawFetch MCP server (HTTP) listening on ${host}:${port}`);
    console.error(`Health: http://${host}:${port}/health`);
    console.error(`MCP endpoint: http://${host}:${port}/mcp`);
    console.error(`Allowed Host headers: ${allowedHosts.join(', ')}`);
  });
} else {
  // Default: stdio transport
  const config = getConfig();
  const server = createServer(config);
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.error(`ClawFetch MCP server (stdio) started — v${version}`);
}
