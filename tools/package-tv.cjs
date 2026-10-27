const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'node_modules/.bin/ares-package');
if (!fs.existsSync(cli)) { console.error('Installer l’outil officiel : npm install --no-save @webos-tools/cli@3.2.6'); process.exit(1); }
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const result = spawnSync(cli, ['tv-app', '--no-minify', '-o', 'dist'], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
