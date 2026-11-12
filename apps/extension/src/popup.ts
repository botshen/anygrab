import { VERSION } from '@anygrab/core';

const appRoot = document.getElementById('app');
if (appRoot) {
  appRoot.textContent = `AnyGrab v${VERSION}`;
}
