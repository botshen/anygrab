#!/usr/bin/env node
import { grab, VERSION, type OutputFormat } from '@anygrab/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseHTML } from 'linkedom';
import { z } from 'zod';

export function createAnyGrabMcpServer(): McpServer {
  const server = new McpServer({
    name: 'anygrab-mcp',
    version: VERSION,
  });

  server.tool(
    'grab_html',
    'Distill raw HTML into token-budget-aware AI context, Tailwind HTML, JSX, or Markdown.',
    {
      html: z.string().describe('Raw HTML string to distill'),
      format: z
        .enum(['prompt', 'tailwind-html', 'jsx', 'markdown'])
        .optional()
        .describe('Desired output format'),
      maxTokens: z.number().int().positive().optional().describe('Optional token budget ceiling'),
      selector: z.string().optional().describe('Optional CSS selector to scope extraction'),
    },
    async ({ html, format, maxTokens, selector }) => {
      const { document } = parseHTML(html);
      const target = selector ? (document.querySelector(selector) ?? document) : document;
      const result = grab(target as unknown as Document, {
        format: (format ?? 'prompt') as OutputFormat,
        maxTokens,
        selector,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: result.output,
          },
        ],
      };
    },
  );

  return server;
}

export async function startMcpStdioServer(): Promise<void> {
  const server = createAnyGrabMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('anygrab-mcp') ||
    process.argv[1].endsWith('/mcp/dist/index.js') ||
    process.argv[1].endsWith('\\mcp\\dist\\index.js'));

if (isDirectExecution) {
  startMcpStdioServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`AnyGrab MCP Server error: ${message}\n`);
    process.exitCode = 1;
  });
}
