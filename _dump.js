const fs = require('fs');
const lines = fs.readFileSync('opsvision-vams/backend/src/server.js', 'utf8').split('\n');
console.log('===== SEED (L48-54) =====');
for (let i = 47; i < 58 && i < lines.length; i++) console.log((i+1) + ': ' + lines[i]);
console.log('===== master deletes (L72-73) =====');
for (let i = 71; i < 74 && i < lines.length; i++) console.log((i+1) + ': ' + lines[i]);
