import 'zone.js/node';
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import bootstrap from './main.server';
import { parse as ptreParse } from 'path-to-regexp';
import { environment } from './environments/environment';
import { regExpPatterns } from '@unsonet/js-utils';

/**
 * Роутер для интеграции в другой сервер (например, unsonet-server).
 */
export function createAngularRouter(distFolderOverride?: string) {
  const router = express.Router();
  const appName =
    environment.appName ??
    ((__dirname || '') as any)?.match(
      /(?<=[\/\\]apps[\/\\])[\w\-]+(?=[\/\\]{0,1})/gm,
    )?.[0];
  const distFolder =
    distFolderOverride || join(process.cwd(), `dist/apps/${appName}/browser`);
  const indexHtml = existsSync(join(distFolder, 'index.original.html'))
    ? join(distFolder, 'index.original.html')
    : join(distFolder, 'index.html');

  const commonEngine = new CommonEngine();

  // статика
  router.get(/.+\..+$/, express.static(distFolder, { maxAge: '1y' }));

  // SSR рендер
  router.get(/.*/, async (req, res, next) => {
    try {
      const { protocol, originalUrl, baseUrl, headers } = req;
      const fullUrl = `${protocol}://${headers.host}${originalUrl}`;

      const html = await commonEngine.render({
        bootstrap,
        documentFilePath: indexHtml,
        url: fullUrl,
        publicPath: distFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      });

      const fixedHtml = html
        .replace(
          regExpPatterns.baseHtmlElement,
          `<base href="${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}">`,
        ) // 🧩 PATCH #1: <base href>
        .replace(
          /href="(?:\.\/)?favicon\.ico"/g,
          `href="${baseUrl}/favicon.ico"`,
        ) // 🧩 PATCH #2: favicon.ico
        .replace(/media="print"/g, 'media="all"'); // 🧩 PATCH #3: media="print" → media="all"

      res.send(fixedHtml);
    } catch (err) {
      console.log('indexHtmlErr', err);
      next(err);
    }
  });

  return router;
}

/**
 * Standalone запуск (как раньше).
 */
export function app(): express.Express {
  const app = express();

  function wrapParseCheck(target: any, name: string) {
    const orig = target[name];
    if (!orig) return;
    target[name] = function (path: any, ...args: any[]) {
      if (typeof path === 'string') {
        try {
          ptreParse(path);
        } catch (err: any) {
          console.error('*** BAD ROUTE PATH DETECTED ***');
          console.error('method:', name);
          console.error('path:', path);
          console.error('error:', err?.message || err);
          throw err;
        }
      }
      return orig.call(this, path, ...args);
    };
  }

  ['route', 'get', 'post', 'put', 'delete', 'patch', 'all', 'use'].forEach(
    (n) => wrapParseCheck(app, n),
  );

  const routerProto = express.Router && (express.Router as any).prototype;
  if (routerProto) {
    ['route', 'get', 'post', 'put', 'delete', 'patch', 'all', 'use'].forEach(
      (n) => wrapParseCheck(routerProto, n),
    );
  }

  app.use('/', createAngularRouter());
  return app;
}

function run(): void {
  const port = process.env['PORT'] || 4000;
  const server = app();
  server.listen(port, () => {
    console.log(`Angular SSR standalone listening on http://localhost:${port}`);
  });
}

// Запускаем только если не импортируется как модуль
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export default bootstrap;
