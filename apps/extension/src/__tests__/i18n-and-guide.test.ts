import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnyGrabPicker } from '../content';
import { initGuideApp } from '../guide';
import { initPopupApp } from '../popup';
import { detectDefaultLocale } from '../shared/i18n';
import { loadSettings, resetMemoryStorageForTests, saveSettings } from '../shared/storage';
import { HOST_ID } from '../shared/types';

describe('Bilingual i18n (zh-CN / en), Plain-Language Popup & Built-In Practice Arena (guide.html)', () => {
  let clipboardSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetMemoryStorageForTests();
    clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardSpy },
    });
  });

  afterEach(() => {
    document.getElementById(HOST_ID)?.remove();
    vi.restoreAllMocks();
  });

  it('auto-detects zh-CN from navigator.language and switches cleanly via Popup & HUD', async () => {
    expect(detectDefaultLocale('zh-CN')).toBe('zh-CN');
    expect(detectDefaultLocale('zh-TW')).toBe('zh-CN');
    expect(detectDefaultLocale('en-US')).toBe('en');

    await saveSettings({ locale: 'zh-CN' });

    const popupRoot = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(popupRoot);

    const openUrlSpy = vi.fn();
    const closeSpy = vi.fn();
    await initPopupApp(popupRoot, {
      openTabUrl: openUrlSpy,
      closeWindow: closeSpy,
      resolveExtensionUrl: (p) => `chrome-extension://test-id/${p}`,
    });

    // Verify plain-language Chinese UI in Popup
    expect(popupRoot.textContent).toContain('怎么用？30 秒练习靶场');
    expect(popupRoot.textContent).toContain('打开官方网站');
    expect(popupRoot.textContent).toContain('AI 复刻指令 (Prompt)');
    expect(popupRoot.textContent).toContain('反重力');

    // Click "📘 怎么用？30 秒练习靶场" opens guide.html
    popupRoot.querySelector<HTMLButtonElement>('[data-action="open-guide"]')!.click();
    await vi.waitFor(() => {
      expect(openUrlSpy).toHaveBeenCalledWith('chrome-extension://test-id/guide.html');
    });

    // Click `中文 / EN` button in Popup -> switches to English and persists
    popupRoot.querySelector<HTMLButtonElement>('[data-action="toggle-locale"]')!.click();
    await vi.waitFor(async () => {
      expect((await loadSettings()).locale).toBe('en');
    });
    expect(popupRoot.textContent).toContain('How to Use · 30s Practice');
  });

  it('switches Shadow DOM HUD language live and generates Chinese AI Prompt via @anygrab/core', async () => {
    document.body.innerHTML = `
      <div class="demo-card" style="padding: 16px; border-radius: 12px; background-color: #4f46e5; color: #ffffff;">
        <h3>企业数据总览</h3>
        <button class="action-btn">导出报表</button>
      </div>
    `;

    const picker = new AnyGrabPicker({ document, window });
    await picker.start({ locale: 'en', format: 'prompt' });

    const host = document.getElementById(HOST_ID)!;
    expect(host.getAttribute('data-anygrab-locale')).toBe('en');

    // Click HUD `中 / EN` button -> live switch to zh-CN
    const hudLocaleBtn = host.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-action="toggle-locale"]',
    )!;
    hudLocaleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(host.getAttribute('data-anygrab-locale')).toBe('zh-CN');
    expect(host.shadowRoot!.querySelector('[data-part="hud-hints"]')?.textContent).toContain(
      '左键点击：复制给 AI',
    );

    picker.selectElement(document.querySelector('.demo-card'));
    const outcome = await picker.grabSelected();

    expect(outcome).not.toBeNull();
    // Verify @anygrab/core produced Chinese replication prompt
    expect(outcome?.result.output).toContain('请 1:1 视觉与布局还原以下从网页提取的 UI 组件');
    expect(outcome?.toastText).toContain('已复制！已为你剔除');
    expect(outcome?.toastText).toContain('反重力 / Codex');
    picker.stop();
  });

  it('renders built-in guide.html Practice Arena and captures both Pricing Card and Merged Table live', async () => {
    await saveSettings({ locale: 'zh-CN', format: 'prompt' });

    const guideRoot = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(guideRoot);

    const openWebsiteSpy = vi.fn();
    const picker = await initGuideApp(guideRoot, {
      openTabUrl: openWebsiteSpy,
    });

    try {
      expect(guideRoot.textContent).toContain('30 秒');
      expect(guideRoot.querySelector('#practice-target-card')).not.toBeNull();
      expect(guideRoot.querySelector('#practice-target-table')).not.toBeNull();

      // Test copying a bonus follow-up prompt pill
      const tplBtn = guideRoot.querySelector<HTMLButtonElement>(
        '[data-action="copy-prompt-template"]',
      )!;
      tplBtn.click();
      await vi.waitFor(() => {
        expect(clipboardSpy).toHaveBeenCalledTimes(1);
      });

      // Click "🎯 开启选框试玩一下" button in the Arena -> activates live Shadow DOM picker!
      const arenaStartBtn = guideRoot.querySelector<HTMLButtonElement>(
        '[data-action="arena-start-picker"]',
      )!;
      arenaStartBtn.click();
      await vi.waitFor(() => {
        expect(picker.isActive()).toBe(true);
      });

      // Select Practice Target 1 (Gradient Pricing Card) and grab it!
      const targetCard = guideRoot.querySelector('#practice-target-card');
      picker.selectElement(targetCard);
      const outcome = await picker.grabSelected();

      expect(outcome).not.toBeNull();
      expect(outcome?.result.output).toContain('请 1:1 视觉与布局还原');
      expect(outcome?.result.output).toContain('AI 团队旗舰版');

      // Arena capture feedback box automatically updates with live preview!
      const captureBox = guideRoot.querySelector('[data-part="arena-capture-box"]')!;
      expect(captureBox.getAttribute('data-captured')).toBe('true');
      expect(captureBox.textContent).toContain('抓取成功');
      expect(guideRoot.querySelector('[data-part="arena-output-preview"]')?.textContent).toContain(
        '请 1:1 视觉与布局还原',
      );
    } finally {
      picker.stop();
    }
  });
});
