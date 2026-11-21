const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2]; // 'mysql' or 'sqlite'

if (target !== 'mysql' && target !== 'sqlite') {
  console.log('Usage: node scripts/switch-db.js [mysql|sqlite]');
  process.exit(1);
}

const prismaDir = path.join(__dirname, '../prisma');
const sourceFile = target === 'mysql' 
  ? path.join(prismaDir, 'schema.mysql.prisma')
  : path.join(prismaDir, 'schema.sqlite.prisma');

const destFile = path.join(prismaDir, 'schema.prisma');

fs.copyFileSync(sourceFile, destFile);
console.log(`Switched Prisma schema provider to: ${target.toUpperCase()}`);

try {
  console.log('Regenerating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log(`Prisma client configured for ${target.toUpperCase()}!`);
} catch (e) {
  console.error('Failed to regenerate prisma client:', e.message);
}
