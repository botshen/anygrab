#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  extractDesignTokens,
  grab,
  VERSION,
  type DesignTokens,
  type OutputFormat,
} from '@anygrab/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  DEFAULT_CSS_TIMEOUT_MS,
  DEFAULT_FETCH_TIMEOUT_MS,
  inlineDataStylesheets,
  loadUrlDocument,
  parseHtmlDocument,
  scopeDocumentToSelector,
  type McpLoaderOptions,
} from './loader';

export type AnyGrabMcpServerOptions = McpLoaderOptions;

const OUTPUT_FORMAT_SCHEMA = z
  .enum(['prompt', 'tailwind-html', 'jsx', 'markdown'])
  .default('prompt')
  .describe(
    'Target serialization format: "prompt" (structured AI context bundle), "tailwind-html" (clean semantic HTML with Tailwind utilities), "jsx" (React JSX component snippet), or "markdown" (high-fidelity GFM preserving tables and code).',
  );

/**
 * Creates and configures an AnyGrab Model Context Protocol (`McpServer`) instance
 * exposing `grab_url`, `grab_html`, and `extract_design_tokens`.
 */
export function createAnyGrabMcpServer(options: AnyGrabMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'anygrab-mcp',
    version: VERSION,
  });

  server.registerTool(
    'grab_url',
    {
      title: 'Grab & Distill Webpage URL',
      description:
        'Fetch a public HTTP/HTTPS webpage URL, automatically inline external <link rel="stylesheet"> CSS into <style> nodes, parse with LinkeDOM, and distill the target DOM into token-budget-aware AI context (prompt, tailwind-html, jsx, or markdown) with compression telemetry.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        url: z
          .string()
          .url()
          .describe('Public HTTP or HTTPS webpage URL to fetch and distill.'),
        selector: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Optional CSS selector to scope extraction to a specific component or section (e.g. "#pricing", "main article").',
          ),
        format: OUTPUT_FORMAT_SCHEMA,
        maxTokens: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            'Optional token budget ceiling (e.g. 1200). Repetitive or low-salience subtrees fold cleanly without breaking HTML/JSX tag closure.',
          ),
        compactSvg: z
          .boolean()
          .default(true)
          .describe(
            'Collapse verbose inline <svg> path data into compact semantic placeholders while keeping dimensions and colors (default: true).',
          ),
        includeHoverStyles: z
          .boolean()
          .default(false)
          .describe(
            'Include interactive :hover Tailwind utility hints matched from page stylesheets (default: false).',
          ),
        adapter: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Optional AnyGrab site/framework adapter name (e.g. "docs-mdx", "github-ui", "arxiv-paper", "marketing-pricing").',
          ),
        cssTimeoutMs: z
          .number()
          .int()
          .positive()
          .max(30_000)
          .optional()
          .describe(
            `Timeout in milliseconds when fetching external <link rel="stylesheet"> CSS assets (default: ${DEFAULT_CSS_TIMEOUT_MS}).`,
          ),
      },
    },
    async ({
      url,
      selector,
      format,
      maxTokens,
      compactSvg,
      includeHoverStyles,
      adapter,
      cssTimeoutMs,
    }) => {
      const { document, finalUrl, inlinedStylesheets, warnings: loaderWarnings } =
        await loadUrlDocument(url, {
          ...options,
          cssTimeoutMs: cssTimeoutMs ?? options.cssTimeoutMs ?? DEFAULT_CSS_TIMEOUT_MS,
          fetchTimeoutMs: options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
        });

      scopeDocumentToSelector(document, selector);

      const result = grab(document, {
        format: (format ?? 'prompt') as OutputFormat,
        selector,
        maxTokens,
        compactSvg: compactSvg ?? true,
        includeHoverStyles: includeHoverStyles ?? false,
        adapter,
        sourceUrl: finalUrl,
      });

      const allWarnings = [...result.warnings, ...loaderWarnings];
      const telemetrySummary = {
        sourceUrl: finalUrl,
        format: result.format,
        inlinedStylesheets,
        metrics: result.metrics,
        designTokens: result.designTokens,
        warnings: allWarnings,
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: result.output,
          },
          {
            type: 'text' as const,
            text: JSON.stringify(telemetrySummary, null, 2),
          },
        ],
        structuredContent: {
          ...telemetrySummary,
          output: result.output,
        },
      };
    },
  );

  server.registerTool(
    'grab_html',
    {
      title: 'Distill Raw HTML Snippet',
      description:
        'Distill a raw HTML document or component fragment (including inline <style> blocks) into clean prompt context, Tailwind HTML, React JSX, or GitHub-Flavored Markdown.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        html: z
          .string()
          .min(1)
          .describe('Raw HTML document or UI snippet (may include <style> tags) to distill.'),
        format: OUTPUT_FORMAT_SCHEMA,
        selector: z
          .string()
          .min(1)
          .optional()
          .describe('Optional CSS selector to scope extraction to a specific element.'),
        maxTokens: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Optional token budget ceiling (e.g. 800).'),
        compactSvg: z
          .boolean()
          .default(true)
          .describe('Collapse verbose inline <svg> path data into compact semantic placeholders.'),
        includeHoverStyles: z
          .boolean()
          .default(false)
          .describe('Include interactive :hover Tailwind utility hints from <style> blocks.'),
        adapter: z
          .string()
          .min(1)
          .optional()
          .describe('Optional AnyGrab adapter name to apply.'),
        sourceUrl: z
          .string()
          .url()
          .optional()
          .describe('Optional source URL context for relative links and adapter matching.'),
      },
    },
    async ({
      html,
      format,
      selector,
      maxTokens,
      compactSvg,
      includeHoverStyles,
      adapter,
      sourceUrl,
    }) => {
      const document = parseHtmlDocument(html);
      inlineDataStylesheets(document);
      scopeDocumentToSelector(document, selector);

      const result = grab(document, {
        format: (format ?? 'prompt') as OutputFormat,
        selector,
        maxTokens,
        compactSvg: compactSvg ?? true,
        includeHoverStyles: includeHoverStyles ?? false,
        adapter,
        sourceUrl,
      });

      const telemetrySummary = {
        format: result.format,
        metrics: result.metrics,
        designTokens: result.designTokens,
        warnings: result.warnings,
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: result.output,
          },
          {
            type: 'text' as const,
            text: JSON.stringify(telemetrySummary, null, 2),
          },
        ],
        structuredContent: {
          ...telemetrySummary,
          output: result.output,
        },
      };
    },
  );

  server.registerTool(
    'extract_design_tokens',
    {
      title: 'Extract UI Design Tokens',
      description:
        'Extract visual design tokens (color palette, font stacks, border radii, box shadows, and spacing scale) as structured JSON from either a public webpage URL or a raw HTML+CSS snippet.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        url: z
          .string()
          .url()
          .optional()
          .describe(
            'Public HTTP/HTTPS webpage URL to inspect (fetches HTML and inlines external <link rel="stylesheet"> CSS). Provide either "url" or "html".',
          ),
        html: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Raw HTML string (with <style> or inline styles) to inspect. Provide either "url" or "html".',
          ),
        selector: z
          .string()
          .min(1)
          .optional()
          .describe('Optional CSS selector to scope token extraction to a target subtree.'),
        cssTimeoutMs: z
          .number()
          .int()
          .positive()
          .max(30_000)
          .optional()
          .describe(
            `Timeout in milliseconds when fetching external stylesheets for "url" (default: ${DEFAULT_CSS_TIMEOUT_MS}).`,
          ),
      },
    },
    async ({ url, html, selector, cssTimeoutMs }) => {
      if (!url && !html) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'Invalid input: provide either "url" (public webpage URL) or "html" (raw HTML snippet) to extract design tokens.',
            },
          ],
        };
      }

      let document: Document;
      let resolvedUrl: string | undefined;
      let warnings: string[] = [];

      if (html) {
        document = parseHtmlDocument(html);
        inlineDataStylesheets(document);
        resolvedUrl = url;
      } else {
        const loaded = await loadUrlDocument(url!, {
          ...options,
          cssTimeoutMs: cssTimeoutMs ?? options.cssTimeoutMs ?? DEFAULT_CSS_TIMEOUT_MS,
          fetchTimeoutMs: options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
        });
        document = loaded.document;
        resolvedUrl = loaded.finalUrl;
        warnings = loaded.warnings;
      }

      scopeDocumentToSelector(document, selector);

      const tokens: DesignTokens = extractDesignTokens(document, {
        selector,
        sourceUrl: resolvedUrl,
      });

      const payload = {
        ...(resolvedUrl ? { sourceUrl: resolvedUrl } : {}),
        designTokens: tokens,
        ...(warnings.length > 0 ? { warnings } : {}),
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(tokens, null, 2),
          },
        ],
        structuredContent: payload,
      };
    },
  );

  return server;
}

/**
 * Connects an AnyGrab MCP server to standard input/output (`StdioServerTransport`)
 * for local Coding Agent hosts (Claude Code, Cursor, Antigravity, Codex).
 */
export async function startMcpStdioServer(options: AnyGrabMcpServerOptions = {}): Promise<McpServer> {
  const server = createAnyGrabMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}

function checkDirectExecution(): boolean {
  if (typeof process === 'undefined' || !Array.isArray(process.argv) || !process.argv[1]) {
    return false;
  }
  try {
    const invokedPath = realpathSync(process.argv[1]);
    const currentPath = realpathSync(fileURLToPath(import.meta.url));
    return invokedPath === currentPath;
  } catch {
    return (
      process.argv[1].endsWith('anygrab-mcp') ||
      process.argv[1].endsWith('/mcp/dist/index.js') ||
      process.argv[1].endsWith('\\mcp\\dist\\index.js')
    );
  }
}

if (checkDirectExecution()) {
  startMcpStdioServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`AnyGrab MCP Server error: ${message}\n`);
    process.exitCode = 1;
  });
}
