//ReferenceError: window is not defined bugfix

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { environment } from './environments/environment';
console.log('c1');
const __non_webpack_require__ = eval('require');
const { JSDOM } = __non_webpack_require__('jsdom');

const appName = environment.appName ?? ((__dirname || '') as any)?.match(/(?<=[\/\\]apps[\/\\])[\w\-]+(?=[\/\\]{0,1})/gm)?.[0];
console.log('appName end', appName);

const isDev = process.env.NODE_ENV_SERVER === 'development';
const distRoot = join(__dirname, '..');
const indexHtmlPath = join(distRoot, 'browser', 'index.html');

if (!existsSync(indexHtmlPath)) {
  throw new Error('index.html not found at ' + indexHtmlPath);
}
const indexHtml = readFileSync(indexHtmlPath, 'utf8');

const dom = new JSDOM(indexHtml, {
  url: process.env?.SERVER_URL || 'http://localhost',
  pretendToBeVisual: true,
});
const win = dom.window;

(globalThis as any).window = win;
(globalThis as any).location = win.location;
(globalThis as any).document = win.document;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: win.navigator,
    configurable: true,
  });
  // if (!('navigator' in globalThis)) {
  //   (globalThis as any).navigator = win.navigator;
  // }
  if (typeof self === 'undefined') {
    (global as any).self = global;
  }
} catch (e) {
  // в Node 20+ navigator — getter, пропускаем
  console.log(e);
}



(globalThis as any).WebSocket = require('ws');
(globalThis as any).XMLHttpRequest = require('xhr2');
(globalThis as any).localStorage = require('localstorage-polyfill');
(globalThis as any).Object = Object;
