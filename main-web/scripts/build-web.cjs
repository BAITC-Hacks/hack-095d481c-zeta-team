'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const publicFiles = require('./site-files.cjs');
const root = path.resolve(__dirname,'..');
async function build() {
  const rootReal = await fs.realpath(root);
  const output = path.join(rootReal,'_site');
  // Verify the exact generated directory before replacing the previous site.
  if (path.dirname(output) !== rootReal || path.basename(output) !== '_site') throw Error('Unsafe output path');
  const old = await fs.lstat(output).catch(error => {if (error.code !== 'ENOENT') throw error; return null;});
  if (old?.isSymbolicLink() || (old && !old.isDirectory())) throw Error('_site must be an ordinary directory.');
  const sources = [];
  for (const relative of publicFiles) {
    const source = await fs.realpath(path.join(rootReal,relative));
    const local = path.relative(rootReal,source);
    if (local.startsWith('..' + path.sep) || path.isAbsolute(local)) throw Error('Asset outside repository: ' + relative);
    sources.push([source,path.join(output,relative)]);
  }
  await fs.rm(output,{recursive:true,force:true});
  for (const [source,target] of sources) {
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.copyFile(source,target);
  }
  console.log('Built _site/ (' + publicFiles.length + ' public files; no input data or build tools).');
  return output;
}
if (require.main === module) build().catch(error => {console.error(error.message);process.exitCode=1;});
module.exports = {build};
