const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const source = path.join(dir, item.name);
    if (item.isDirectory()) walk(source);
    else if (/\.(ejs|sql|py)$/.test(item.name)) {
      const target = path.join(root, 'build', path.relative(path.join(root, 'src'), source));
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
    }
  }
}
walk(path.join(root, 'src'));
fs.copyFileSync(path.join(root, 'package.json'), path.join(root, 'build/package.json'));
const tvVendor = path.join(root, 'tv-app/vendor');
fs.mkdirSync(tvVendor, { recursive: true });
fs.copyFileSync(path.join(root, 'node_modules/hls.js/dist/hls.min.js'), path.join(tvVendor, 'hls.min.js'));
fs.copyFileSync(path.join(root, 'node_modules/hls.js/LICENSE'), path.join(tvVendor, 'LICENSE.hls.js.txt'));
