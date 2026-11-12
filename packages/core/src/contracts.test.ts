import { describe, expect, it } from 'vitest';
import { estimateTokens, grab, registerAdapter, clearAdapters, getAdapters } from './index';
import type { AnyGrabAdapter, GrabOptions } from './types';

describe('@anygrab/core type contracts', () => {
  it('returns a complete GrabResult adhering to core contracts', () => {
    const options: GrabOptions = {
      format: 'markdown',
      maxTokens: 1200,
      compactSvg: true,
      preserveTables: true,
    };
    const result = grab('<section class="card"><h1>Hello AnyGrab</h1></section>', options);

    expect(result.format).toBe('markdown');
    expect(result.markdown).toContain('Hello AnyGrab');
    expect(result.jsx).toContain('className=');
    expect(result.designTokens).toEqual({
      colors: [],
      fonts: [],
      radii: [],
      shadows: [],
      spacings: [],
    });
    expect(result.metrics.rawChars).toBeGreaterThan(0);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(estimateTokens('Hello AnyGrab')).toBeGreaterThan(0);
  });

  it('registers and sorts AnyGrabAdapter instances by priority', () => {
    clearAdapters();
    const low: AnyGrabAdapter = { name: 'low', priority: 1, match: /example\.com/ };
    const high: AnyGrabAdapter = { name: 'high', priority: 10, match: () => true };
    registerAdapter(low);
    registerAdapter(high);

    expect(getAdapters().map((a) => a.name)).toEqual(['high', 'low']);
    clearAdapters();
  });
});
