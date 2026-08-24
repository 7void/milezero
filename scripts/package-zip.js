import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const tempDir = path.resolve('temp_submission_staging');
if (fs.existsSync(tempDir)) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}
fs.mkdirSync(tempDir, { recursive: true });

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  const baseName = path.basename(src);

  if (stats.isDirectory()) {
    if (
      baseName === 'node_modules' ||
      baseName === 'dist' ||
      baseName === '.git' ||
      baseName === 'temp_submission_staging' ||
      baseName === 'coverage'
    ) {
      return;
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    if (
      baseName === '.env' ||
      baseName.startsWith('.env.') && baseName !== '.env.example' ||
      baseName.endsWith('.tsbuildinfo') ||
      baseName.endsWith('.log') ||
      baseName === 'milezero-submission.zip'
    ) {
      return;
    }
    fs.copyFileSync(src, dest);
  }
}

const itemsToCopy = [
  'src',
  'backend',
  'public',
  '.github',
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'eslint.config.js',
  'vercel.json',
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

try {
  if (fs.existsSync('milezero-submission.zip')) {
    fs.unlinkSync('milezero-submission.zip');
  }
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path temp_submission_staging\\* -DestinationPath milezero-submission.zip -Force"`);
  console.log('Archive created successfully.');
} catch (e) {
  console.error('Archive error:', e.message);
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}

if (fs.existsSync('milezero-submission.zip')) {
  const zipStats = fs.statSync('milezero-submission.zip');
  console.log(`Created milezero-submission.zip (${(zipStats.size / (1024 * 1024)).toFixed(2)} MB)`);
}
