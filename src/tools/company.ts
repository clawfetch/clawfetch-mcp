import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClawFetch } from '@clawfetch/sdk';

export function registerCompanyTools(server: McpServer, client: ClawFetch) {
  server.tool(
    'enrich_company',
    'Company enrichment from a domain: firmographic profile of a company website. Returns name, description, logo, social profiles (LinkedIn, X, GitHub, YouTube, Crunchbase and more), contact emails and phones, postal address, schema.org Organization data, detected tech stack and key pages (about, careers, pricing, docs). Deterministic parse of the live site, no LLM. Cost: $0.02 per request.',
    {
      domain: z.string().min(1).describe('Company domain (e.g. "stripe.com") or any URL on the site; normalized to the bare host'),
    },
    async ({ domain }) => {
      try {
        const r = await client.company(domain);
        const line = (label: string, value: string | null | undefined) =>
          value ? `- **${label}:** ${value}` : null;
        const socials = Object.entries(r.socials ?? {})
          .filter(([, v]) => v)
          .map(([k, v]) => `- ${k}: ${v}`);
        const pages = Object.entries(r.pages ?? {})
          .filter(([, v]) => v)
          .map(([k, v]) => `- ${k}: ${v}`);
        const tech = (r.techStack ?? []).map(t => `- ${t.name} (${t.category})`);
        const addresses = (r.addresses ?? []).map(a =>
          `- ${[a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry].filter(Boolean).join(', ')}`,
        );

        const parts: string[] = [`## ${r.name ?? r.domain}`, ''];
        for (const l of [
          line('Domain', r.domain),
          line('URL', r.url),
          line('Description', r.description),
          line('Logo', r.logo),
          line('Language', r.language),
        ]) if (l) parts.push(l);
        if (socials.length) parts.push('', '### Socials', ...socials);
        if (r.emails?.length) parts.push('', '### Emails', ...r.emails.map(e => `- ${e}`));
        if (r.phones?.length) parts.push('', '### Phones', ...r.phones.map(p => `- ${p}`));
        if (addresses.length) parts.push('', '### Addresses', ...addresses);
        if (tech.length) parts.push('', '### Tech stack', ...tech);
        if (pages.length) parts.push('', '### Key pages', ...pages);
        if (r.organization) parts.push('', '### schema.org Organization', '```json', JSON.stringify(r.organization, null, 2), '```');
        parts.push('', `_Fetched ${r.fetchedAt} from ${(r.fetchedPages ?? []).length} page(s)_`);

        return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
