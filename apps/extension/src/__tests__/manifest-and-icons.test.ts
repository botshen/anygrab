import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('Extension Manifest V3, _locales & Generated Brand Icons', () => {
  it('defines a minimal, CWS-compliant bilingual Manifest V3 configuration', () => {
    const manifestPath = resolve(extRoot, 'public/manifest.json');
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      manifest_version: number;
      default_locale?: string;
      name: string;
      description: string;
      version: string;
      permissions: string[];
      host_permissions?: string[];
      commands?: Record<string, { suggested_key?: { default?: string; mac?: string } }>;
      content_scripts?: Array<{ matches: string[]; js: string[]; run_at: string }>;
      background?: { service_worker?: string };
      icons?: Record<string, string>;
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.default_locale).toBe('en');
    expect(manifest.name).toBe('__MSG_extName__');
    expect(manifest.description).toBe('__MSG_extDescription__');
    expect(manifest.version).toBe('0.2.0');

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

    // Verify standard Chrome _locales files (en + zh_CN)
    const zhLocalePath = resolve(extRoot, 'public/_locales/zh_CN/messages.json');
    const enLocalePath = resolve(extRoot, 'public/_locales/en/messages.json');
    expect(existsSync(zhLocalePath)).toBe(true);
    expect(existsSync(enLocalePath)).toBe(true);

    const zhMessages = JSON.parse(readFileSync(zhLocalePath, 'utf8')) as Record<
      string,
      { message: string }
    >;
    const enMessages = JSON.parse(readFileSync(enLocalePath, 'utf8')) as Record<
      string,
      { message: string }
    >;

    expect(zhMessages.extName?.message).toBe('AnyGrab — AI 编程网页组件扒取神器');
    expect(zhMessages.extDescription?.message).toContain('反重力');
    expect(enMessages.extName?.message).toContain('AnyGrab');
  });

  it.each([16, 32, 48, 128])(
    'contains a valid RGBA PNG file for icon-%i.png',
    (expectedSize) => {
      const iconPath = resolve(extRoot, `public/icons/icon-${expectedSize}.png`);
      expect(existsSync(iconPath)).toBe(true);

      const buf = readFileSync(iconPath);
      expect(buf.length).toBeGreaterThan(100);

      expect(Array.from(buf.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

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

      const iendType = buf.subarray(buf.length - 8, buf.length - 4).toString('ascii');
      expect(iendType).toBe('IEND');
    },
  );
});
