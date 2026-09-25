import { hostHeaderValidation } from '@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js';
import type { RequestHandler } from 'express';

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

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
