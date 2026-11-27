import { hostHeaderValidation } from '@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js';
import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const LOOPBACK_BINDS = ['127.0.0.1', 'localhost', '::1', '[::1]'];

/**
 * Hostnames the HTTP transport accepts in the Host header (CVE-2025-66414 class).
 * Defaults to loopback so a malicious web page cannot DNS-rebind onto a local
 * server that holds a funded wallet. Remote deployments list their public names
 * in CLAWFETCH_ALLOWED_HOSTS (comma-separated).
 */
export function allowedHostsFromEnv(raw: string | undefined): string[] {
  const hosts = (raw ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length ? hosts : LOOPBACK_HOSTS;
}

export function hostGuard(allowedHosts: string[]): RequestHandler {
  return hostHeaderValidation(allowedHosts);
}

/** True when the listen address only reaches processes on this machine. */
export function isLoopbackBind(host: string): boolean {
  return LOOPBACK_BINDS.includes(host.trim().toLowerCase());
}

/**
 * Every tool call signs an x402 payment with the operator wallet, so a caller
 * that can reach /mcp can spend it. The Host allowlist identifies the server
 * name a client asked for, never the client, so remote binds need a shared
 * secret. Loopback binds may run without one (same trust boundary as stdio).
 * Returns the reason the configuration is unsafe, or null when it is fine.
 */
export function remoteBindProblem(host: string, authToken: string | undefined): string | null {
  if (authToken) return null;
  if (isLoopbackBind(host)) return null;
  return `CLAWFETCH_HOST=${host} is reachable from other machines; set CLAWFETCH_AUTH_TOKEN so remote callers must authenticate before the operator wallet pays for their calls, or bind to 127.0.0.1.`;
}

function tokenMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Bearer-token check for the MCP endpoint. With no token configured it is a
 * pass-through (only allowed on loopback binds, see remoteBindProblem). With a
 * token configured every request must carry `Authorization: Bearer <token>`.
 */
export function bearerAuth(authToken: string | undefined): RequestHandler {
  return (req, res, next) => {
    if (!authToken) {
      next();
      return;
    }
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (match && tokenMatches(match[1].trim(), authToken)) {
      next();
      return;
    }
    res.setHeader('WWW-Authenticate', 'Bearer realm="clawfetch-mcp"');
    res.status(401).json({
      error: 'Unauthorized: this MCP server pays for tool calls from its operator wallet and requires Authorization: Bearer <CLAWFETCH_AUTH_TOKEN>',
    });
  };
}
