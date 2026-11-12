import { VERSION } from '@anygrab/core';

chrome.runtime.onInstalled.addListener(() => {
  console.info(`[AnyGrab] Extension v${VERSION} installed.`);
});
