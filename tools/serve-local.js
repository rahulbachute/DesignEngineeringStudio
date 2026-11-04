'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.DES_LOCAL_PORT || 5500);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.pdf':'application/pdf'};
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.includes('\\') || pathname.split('/').some(p => p.startsWith('.'))) { res.writeHead(403); res.end(); return; }
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    let stat = await fs.promises.stat(file);
    if (stat.isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(302, {Location: pathname + '/'}); res.end(); return; }
      file = path.join(file, 'index.html');
      stat = await fs.promises.stat(file);
    }
    if (!stat.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store', 'Content-Length':stat.size});
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 400); res.end('File unavailable.'); }
});
server.on('error', error => { console.error(error.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log('DES local server: http://127.0.0.1:' + port + '/'));
