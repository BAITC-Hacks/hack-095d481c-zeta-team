'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const publicFiles = new Set(require('./site-files.cjs'));
const ROOT = path.resolve(__dirname, '..');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const CSP = "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
function basePath(value = '/') {
  if (value === '/') return '/';
  if (!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/?$/.test(value)) throw Error('Base path must look like /procureflow-web/.');
  return value.endsWith('/') ? value : value + '/';
}
function createServer({root = ROOT, base = '/'} = {}) {
  root = path.resolve(root);
  base = basePath(base);
  const server = http.createServer(async (req, res) => {
    const headers = {'Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'};
    const reply = (status, message) => {res.writeHead(status, {...headers,'Content-Type':'text/plain; charset=utf-8'}); res.end(req.method === 'HEAD' ? undefined : message);};
    const port = server.address()?.port;
    if (![ '127.0.0.1:' + port, 'localhost:' + port ].includes(req.headers.host)) return reply(403, 'Forbidden host');
    if (!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD'); return reply(405,'Method not allowed');}
    let pathname;
    try {pathname = decodeURIComponent(String(req.url).split('?')[0]);} catch {return reply(400, 'Bad path');}
    if (!pathname.startsWith('/') || /[\\\x00-\x1f]/.test(pathname) || pathname.split('/').some(p => p === '.' || p === '..')) return reply(400,'Bad path');
    if (base !== '/' && (pathname === '/' || pathname === base.slice(0,-1))) {
      res.writeHead(302,{...headers,Location:base}); return res.end();
    }
    if (!pathname.startsWith(base)) return reply(404,'Not found');
    const relative = pathname.slice(base.length) || 'index.html';
    if (!publicFiles.has(relative)) return reply(404,'Not found');
    try {
      const rootReal = await fs.realpath(root);
      const file = await fs.realpath(path.join(root,relative));
      const within = path.relative(rootReal,file);
      if (within.startsWith('..' + path.sep) || path.isAbsolute(within)) return reply(403,'Forbidden');
      const bytes = await fs.readFile(file);
      res.writeHead(200,{...headers,'Content-Type':MIME[path.extname(relative)] || 'text/plain; charset=utf-8','Content-Length':bytes.length});
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      if (error.code === 'ENOENT') return reply(404,'Not found');
      reply(500,'Unable to read application asset');
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
async function main() {
  let port = Number(process.env.PORT || 8000), base = '/';
  const args = process.argv.slice(2);
  for (let i=0; i<args.length; i++) {
    if (args[i] === '--port') port = Number(args[++i]);
    else if (args[i] === '--base-path') base = basePath(args[++i] || '');
    else throw Error('Unknown option: ' + args[i]);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Port must be 1..65535.');
  const server = createServer({base});
  server.on('error',error => {
    console.error(error.code === 'EADDRINUSE' ? 'Port ' + port + ' is busy. Try: npm start -- --port 8001' : error.message);
    process.exitCode = 1;
  });
  server.listen(port,'127.0.0.1',() => {
    console.log('ProcureFlow Web: http://127.0.0.1:' + port + base);
    console.log('Open this URL in Chrome or Edge. Keep this terminal open; Ctrl+C stops the server.');
  });
}
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode=1;});
module.exports = {createServer,basePath};
