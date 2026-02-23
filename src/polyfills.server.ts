//ReferenceError: window is not defined bugfix

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { environment } from './environments/environment';
console.log('appName wtf');
const __non_webpack_require__ = eval('require');
const { JSDOM } = __non_webpack_require__('jsdom');
console.log('appName start');
const appName = environment.appName ?? ((__dirname || '') as any).match(/(?<=[\/\\]apps[\/\\])[\w\-]+(?=[\/\\]{0,1})/gm)?.[0];
console.log('appName end', appName);

const isDev = process.env.NODE_ENV_SERVER === 'development';
const distRoot = isDev ? join(process.cwd(), 'dist/apps/'+appName) : join(process.cwd(), 'apps/'+appName);

const indexHtmlPath = join(distRoot,'/browser/index.html');
console.log('Trying to read', process.env.NODE_ENV_SERVER, indexHtmlPath);
if (!existsSync(indexHtmlPath)) throw new Error('index.html not found');
const indexHtml = readFileSync(indexHtmlPath, 'utf8');

const dom = new JSDOM(indexHtml, {
  url: process.env?.SERVER_URL || 'http://localhost',
  pretendToBeVisual: true,
});
const win = dom.window;

(globalThis as any).window = win;
(globalThis as any).document = win.document;
try {
  if (!('navigator' in globalThis)) {
    (globalThis as any).navigator = win.navigator;
  }
} catch {
  // в Node 20+ navigator — getter, пропускаем
}

(globalThis as any).WebSocket = require('ws');
(globalThis as any).XMLHttpRequest = require('xhr2');
(globalThis as any).localStorage = require('localstorage-polyfill');
(globalThis as any).Object = Object;