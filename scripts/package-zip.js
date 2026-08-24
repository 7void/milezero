import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const tempDir = path.resolve('temp_submission_staging');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    const baseName = path.basename(src);
    if (baseName === 'node_modules' || baseName === 'dist' || baseName === '.git' || baseName === 'temp_submission_staging') {
      return;
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    const baseName = path.basename(src);
    if (baseName === '.env' || baseName === 'milezero-submission.zip') {
      return;
    }
    fs.copyFileSync(src, dest);
  }
}

const itemsToCopy = [
  'src',
  'backend',
  'public',
  'index.html',
  'package.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'eslint.config.js',
  'docker-compose.yml',
  'README.md',
  'SYSTEM_DESIGN.md',
  '.env.example',
  '.gitignore',
];

for (const item of itemsToCopy) {
  if (fs.existsSync(item)) {
    copyRecursive(item, path.join(tempDir, item));
  }
}

execSync(`powershell -Command "Compress-Archive -Path temp_submission_staging/* -DestinationPath milezero-submission.zip -Force"`);
fs.rmSync(tempDir, { recursive: true, force: true });

const zipStats = fs.statSync('milezero-submission.zip');
console.log(`Created milezero-submission.zip (${(zipStats.size / (1024 * 1024)).toFixed(2)} MB)`);
