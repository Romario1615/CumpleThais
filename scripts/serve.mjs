import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(root, requested);
    const relative = path.relative(root, file);
    const allowed = ['index.html', 'styles.css', 'config.js', 'core.js', 'script.js'].includes(relative) || relative.startsWith(`assets${path.sep}`);
    if (!allowed || relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(404); res.end('No encontrado'); return; }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('No encontrado'); }
});
const port = Number(process.env.PORT || 5173);
server.listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}/`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
