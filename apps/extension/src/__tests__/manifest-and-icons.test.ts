import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('Extension Manifest V3 & Generated Brand Icons', () => {
  it('defines a minimal, CWS-compliant Manifest V3 configuration', () => {
    const manifestPath = resolve(extRoot, 'public/manifest.json');
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      manifest_version: number;
      permissions: string[];
      host_permissions?: string[];
      commands?: Record<string, { suggested_key?: { default?: string; mac?: string } }>;
      content_scripts?: Array<{ matches: string[]; js: string[]; run_at: string }>;
      background?: { service_worker?: string };
      icons?: Record<string, string>;
    };

    expect(manifest.manifest_version).toBe(3);
    expect([...manifest.permissions].sort()).toEqual(
      ['activeTab', 'clipboardWrite', 'scripting', 'storage'].sort(),
    );
    expect(manifest.host_permissions).toBeUndefined();

    expect(manifest.commands?.['toggle-picker']?.suggested_key).toEqual({
      default: 'Alt+Shift+G',
      mac: 'Alt+Shift+G',
    });

    expect(manifest.background?.service_worker).toBe('background.js');
    expect(manifest.content_scripts).toEqual([
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_idle',
      },
    ]);

    expect(manifest.icons).toEqual({
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    });
  });

  it.each([16, 32, 48, 128])(
    'contains a valid RGBA PNG file for icon-%i.png',
    (expectedSize) => {
      const iconPath = resolve(extRoot, `public/icons/icon-${expectedSize}.png`);
      expect(existsSync(iconPath)).toBe(true);

      const buf = readFileSync(iconPath);
      expect(buf.length).toBeGreaterThan(100);

      // 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
      expect(Array.from(buf.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

      // First chunk must be IHDR with exact width, height, 8-bit RGBA (colorType = 6)
      const ihdrType = buf.subarray(12, 16).toString('ascii');
      expect(ihdrType).toBe('IHDR');
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      const bitDepth = buf[24];
      const colorType = buf[25];

      expect(width).toBe(expectedSize);
      expect(height).toBe(expectedSize);
      expect(bitDepth).toBe(8);
      expect(colorType).toBe(6);

      // Final 12 bytes must be empty IEND chunk (00 00 00 00 'IEND' AE 42 60 82)
      const iendType = buf.subarray(buf.length - 8, buf.length - 4).toString('ascii');
      expect(iendType).toBe('IEND');
    },
  );
});
