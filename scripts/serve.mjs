import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif' };
const clients = new Set();
const liveReload = `<script>(()=>{const stream=new EventSource('/__reload');let connected=false;stream.addEventListener('ready',()=>{if(connected)location.reload();connected=true;});stream.addEventListener('reload',()=>location.reload());})();</script>`;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive' });
      res.write('event: ready\ndata: connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(root, requested);
    const relative = path.relative(root, file);
    const allowed = ['index.html', 'styles.css', 'config.js', 'core.js', 'effects.js', 'mascot.js', 'script.js'].includes(relative) || relative.startsWith(`assets${path.sep}`);
    if (!allowed || relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(404); res.end('No encontrado'); return; }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    let data = await readFile(file);
    if (relative === 'index.html') data = data.toString('utf8').replace('</body>', `${liveReload}</body>`);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('No encontrado'); }
});
const port = Number(process.env.PORT || 5173);
let reloadTimer;
function changed(_event, filename) {
  if (!filename || !/\.(html|css|js|svg|png|jpe?g|webp|avif|gif)$/i.test(String(filename))) return;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => { for (const client of clients) client.write('event: reload\ndata: updated\n\n'); }, 120);
}
const watchers = [watch(root, changed), watch(path.join(root, 'assets'), { recursive: true }, changed)];
server.on('close', () => { watchers.forEach(watcher => watcher.close()); clearTimeout(reloadTimer); clients.forEach(client => client.end()); });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}/`));
server.on('error', error => { console.error(error.message); watchers.forEach(watcher => watcher.close()); process.exitCode = 1; });
