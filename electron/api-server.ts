import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import all API handlers directly so Vite bundles them into the Electron main process
import albumHandler from '../api/album';
import artistHandler from '../api/artist';
import chatHandler from '../api/chat';
import downloadHandler from '../api/download';
import lyricsHandler from '../api/lyrics';
import oracleHandler from '../api/oracle';
import proxyImageHandler from '../api/proxy-image';
import radioHandler from '../api/radio';
import searchHandler from '../api/search';
import trendingHandler from '../api/trending';

const handlers: Record<string, any> = {
  'album': albumHandler,
  'artist': artistHandler,
  'chat': chatHandler,
  'download': downloadHandler,
  'lyrics': lyricsHandler,
  'oracle': oracleHandler,
  'proxy-image': proxyImageHandler,
  'radio': radioHandler,
  'search': searchHandler,
  'trending': trendingHandler,
};

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.cjs':  'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.webp': 'image/webp',
  '.mp3':  'audio/mpeg',
  '.webm': 'audio/webm',
};

export function startLocalApiServer(): Promise<number> {
  return new Promise((resolve) => {
    // Resolve dist folder relative to THIS file at runtime.
    //
    // In DEV:       dist-electron/api-server.js  →  ../dist  ✅
    //
    // In PACKAGED:  Electron puts the web app at:
    //   app.asar/dist/           (inside the archive)
    //   app.asar/dist-electron/  (also inside the archive)
    //   app.asar.unpacked/dist-electron/preload.cjs  (unpacked)
    //
    // import.meta.url in a packaged build is a file:// URL pointing INSIDE app.asar.
    // path.resolve(__dirname, '../dist') still works because Node can read asar files
    // transparently via the asar protocol patch Electron applies.
    //
    // However if BOTH the server and the dist folder end up in the same asar we can
    // still read them.  The only failure case is if resourcesPath is set differently.
    // We try multiple candidate paths and use the first one that contains index.html.

    const serverFileUrl = import.meta.url;
    const serverFilePath = fileURLToPath(serverFileUrl);
    const serverDir = path.dirname(serverFilePath);

    // Candidate paths in priority order
    const distCandidates = [
      path.resolve(serverDir, '..', 'dist'),                         // dev & standard asar
      path.resolve(process.resourcesPath || '', 'app', 'dist'),      // some packagers
      path.resolve(process.resourcesPath || '', 'dist'),             // alternate layout
      path.resolve(serverDir, 'dist'),                               // same folder fallback
    ];

    let distPath = distCandidates[0]; // default
    for (const candidate of distCandidates) {
      if (fs.existsSync(path.join(candidate, 'index.html'))) {
        distPath = candidate;
        break;
      }
    }

    console.log('[API Server] serverDir:', serverDir);
    console.log('[API Server] distPath resolved to:', distPath);
    console.log('[API Server] index.html exists:', fs.existsSync(path.join(distPath, 'index.html')));


    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        if (!req.url) {
          res.statusCode = 404;
          return res.end('Not found');
        }

        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname || '';

        // Match /api/{route}
        const match = pathname.match(/^\/api\/([^\/]+)/);
        if (!match) {
          // Serve static files from dist folder
          let filePath = path.join(distPath, pathname === '/' ? 'index.html' : pathname);

          // Detect if this is a request for a real asset (js, css, image, font, etc.)
          // These must NEVER fall back to index.html — that causes the MIME type error.
          const requestedExt = path.extname(pathname).toLowerCase();
          const isAssetRequest = requestedExt.length > 0 && requestedExt !== '.html';

          if (isAssetRequest) {
            // Asset file: serve it directly or return 404 (never serve HTML for JS/CSS)
            if (!fs.existsSync(filePath)) {
              console.error(`[API Server] Asset not found: ${filePath}`);
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end(`404: Asset not found: ${pathname}`);
              return;
            }
          } else {
            // HTML navigation route: SPA fallback — serve index.html for any unknown route
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
              filePath = path.join(distPath, 'index.html');
            }
          }

          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';

          fs.readFile(filePath, (err, content) => {
            if (err) {
              console.error('[API Server] readFile error:', err.message, filePath);
              res.writeHead(500);
              res.end(`Server error: ${err.message}`);
            } else {
              res.writeHead(200, { 'Content-Type': contentType });
              res.end(content);
            }
          });
          return;
        }

        const route = match[1];
        const handler = handlers[route];

        if (!handler) {
          res.statusCode = 404;
          return res.end('API route not found');
        }

        // Mock Vercel Request/Response
        const vercelReq = req as any;
        vercelReq.query = parsedUrl.query;
        
        // Parse body for POST requests
        if (req.method === 'POST' || req.method === 'PUT') {
          const chunks: any[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const bodyStr = Buffer.concat(chunks).toString();
          try {
            vercelReq.body = JSON.parse(bodyStr);
          } catch {
            vercelReq.body = bodyStr;
          }
        }

        const vercelRes = res as any;
        vercelRes.status = (code: number) => {
          vercelRes.statusCode = code;
          return vercelRes;
        };
        vercelRes.json = (data: any) => {
          vercelRes.setHeader('Content-Type', 'application/json');
          vercelRes.end(JSON.stringify(data));
        };

        await handler(vercelReq, vercelRes);

      } catch (err: any) {
        console.error('API Error:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    });

    const PORT = 15432;
    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`Port ${PORT} is in use, falling back to random port for Pandoos... (Google Login might fail)`);
        server.listen(0, '127.0.0.1');
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      console.log(`Local API server listening on port ${port}`);
      resolve(port);
    });
  });
}
