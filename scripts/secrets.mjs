// Removes secrets from the output directory before publishing

import glob from 'fast-glob';
import fs from 'fs/promises';

const files = await glob('out/**/node_modules/**/*.{key,crt}');
console.log('files to remove:', files);
await Promise.all(files.map(file => fs.unlink(file)));