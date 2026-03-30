import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPrompts(server: McpServer): void {

  // ─── Research Topic ──────────────────────────────────────────
  server.prompt(
    'research-topic',
    'Guided multi-source research workflow. Combines research_topic for an overview, then fetch_url/extract_data for deep dives on key sources.',
    { topic: z.string().describe('The topic to research') },
    async ({ topic }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text:
            `Research the topic: "${topic}"\n\n` +
            `Follow this workflow:\n` +
            `1. Use the \`research_topic\` tool to get a multi-source overview (costs $0.01)\n` +
            `2. Review the sources returned. For the 2-3 most relevant ones, use \`fetch_url\` to get the full content ($0.001 each)\n` +
            `3. If any source is a supported platform (GitHub, LinkedIn, Crunchbase, etc.), use \`extract_data\` instead for structured information ($0.003)\n` +
            `4. Synthesize findings into a comprehensive report with:\n` +
            `   - Executive summary (2-3 sentences)\n` +
            `   - Key findings (bullet points)\n` +
            `   - Source citations with URLs\n` +
            `   - Confidence assessment (what's well-sourced vs. uncertain)\n\n` +
            `Estimated cost: $0.013-$0.022 depending on depth.`,
        },
      }],
    }),
  );

  // ─── Competitive Analysis ────────────────────────────────────
  server.prompt(
    'competitive-analysis',
    'Compare companies or products using structured data extraction and research. Best for analyzing competitors with web presence.',
    {
      subject: z.string().describe('Primary company or product to analyze'),
      competitors: z.string().describe('Comma-separated list of competitor names or URLs'),
    },
    async ({ subject, competitors }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text:
            `Perform a competitive analysis of "${subject}" against: ${competitors}\n\n` +
            `Workflow:\n` +
            `1. Use \`research_topic\` for "${subject} vs ${competitors}" to get market context ($0.01)\n` +
            `2. For each company/product with a website:\n` +
            `   - Use \`fetch_url\` on their homepage/product page ($0.001 each)\n` +
            `   - If they have a GitHub repo, use \`extract_data\` for repo metrics ($0.003)\n` +
            `   - If they have a Crunchbase/LinkedIn page, use \`extract_data\` for company data ($0.003)\n` +
            `3. Compile a comparison matrix covering:\n` +
            `   - Product positioning & target market\n` +
            `   - Key features / differentiators\n` +
            `   - Pricing model (if public)\n` +
            `   - Technical approach / stack\n` +
            `   - Community / traction metrics\n` +
            `   - Strengths & weaknesses\n` +
            `4. Conclude with strategic recommendations for "${subject}"\n\n` +
            `Estimated cost: $0.02-$0.05 depending on number of competitors.`,
        },
      }],
    }),
  );

  // ─── Domain Hunting ──────────────────────────────────────────
  server.prompt(
    'domain-hunting',
    'Find the perfect domain name. Generates creative suggestions, checks availability, and recommends the best options.',
    {
      concept: z.string().describe('What the domain is for (product name, idea, keywords)'),
      tlds: z.string().optional().describe('Preferred TLDs, comma-separated (default: .com, .io, .ai, .dev)'),
    },
    async ({ concept, tlds }) => {
      const tldList = tlds ?? '.com, .io, .ai, .dev';
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text:
              `Find available domain names for: "${concept}"\n` +
              `Preferred TLDs: ${tldList}\n\n` +
              `Workflow:\n` +
              `1. Use \`suggest_domains\` with the concept to get AI-generated suggestions ($0.002)\n` +
              `2. Review results. For any promising names that were not checked, use \`check_domains\` ($0.002)\n` +
              `3. Brainstorm 5-10 additional creative name ideas yourself, then check those with \`check_domains\`\n` +
              `4. Present results organized as:\n` +
              `   - **Top picks** — available, memorable, relevant (ranked)\n` +
              `   - **Alternatives** — available but less ideal\n` +
              `   - **Taken but notable** — great names that are unavailable\n` +
              `   - For each recommendation, explain why it works\n\n` +
              `Estimated cost: $0.004-$0.010 depending on how many batches you check.`,
          },
        }],
      };
    },
  );

  // ─── Site Audit ──────────────────────────────────────────────
  server.prompt(
    'site-audit',
    'Analyze a website for content quality, SEO, structure, and technical aspects. Uses fetch + render + extract.',
    { url: z.string().describe('Website URL to audit') },
    async ({ url }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text:
            `Perform a comprehensive audit of: ${url}\n\n` +
            `Workflow:\n` +
            `1. Use \`fetch_url\` to get the page content as markdown ($0.001)\n` +
            `2. Use \`render_page\` to see the JS-rendered version — compare with fetch to identify dynamic content ($0.002)\n` +
            `3. If the site is on a supported platform (GitHub, Product Hunt, etc.), also use \`extract_data\` ($0.003)\n` +
            `4. Analyze and report on:\n\n` +
            `   **Content Quality:**\n` +
            `   - Clarity of messaging and value proposition\n` +
            `   - Content completeness and depth\n` +
            `   - Call-to-action effectiveness\n\n` +
            `   **Technical / SEO:**\n` +
            `   - Heading structure (H1, H2, etc.)\n` +
            `   - Meta information present/missing\n` +
            `   - Content-to-HTML ratio (static vs JS-rendered)\n` +
            `   - Mobile/accessibility considerations\n\n` +
            `   **Structure:**\n` +
            `   - Navigation and information architecture\n` +
            `   - Internal linking\n` +
            `   - Key pages identified\n\n` +
            `   **Recommendations:**\n` +
            `   - Priority improvements (high/medium/low)\n` +
            `   - Quick wins vs. larger efforts\n\n` +
            `Estimated cost: $0.003-$0.006.`,
        },
      }],
    }),
  );
}
