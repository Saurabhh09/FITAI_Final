
const fs = require('fs');
const path = require('path');

const cliPath = path.resolve(__dirname, '../node_modules/expo/bin/cli');

if (fs.existsSync(cliPath)) {
  const content = fs.readFileSync(cliPath, 'utf8');
  const patchMarker = '// [fitai-monorepo-dispatch]';

  const patch = `#!/usr/bin/env node
${patchMarker}
const fs = require('fs');
const path = require('path');

// Automatically redirect expo commands run from monorepo root to apps/mobile
const rootDir = path.resolve(__dirname, '../../..');
const mobileDir = path.resolve(rootDir, 'apps/mobile');
const currentCwd = path.resolve(process.cwd()).toLowerCase();
const rootCwd = rootDir.toLowerCase();

if (fs.existsSync(mobileDir) && currentCwd === rootCwd) {
  process.chdir(mobileDir);
}

require('@expo/cli');
`;
  fs.writeFileSync(cliPath, patch, 'utf8');
  console.log('[fitai] Patched node_modules/expo/bin/cli for root monorepo dispatch.');
}
