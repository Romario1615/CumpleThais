import { mkdir, copyFile, cp, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'config.js', 'core.js', 'effects.js', 'mascot.js', 'rhythm.js', 'audio.js', 'script.js']) {
  await copyFile(path.join(root, file), path.join(output, file));
}
await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
const html = await readFile(path.join(output, 'index.html'), 'utf8');
for (const [, resource] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!/^(https?:|data:)/.test(resource)) await stat(path.join(output, resource));
}
console.log('Página lista: HTML, CSS, JavaScript y fotos copiados a dist/.');
