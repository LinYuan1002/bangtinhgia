const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.prisma = { seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" };
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2), 'utf8');
console.log('package.json updated');
