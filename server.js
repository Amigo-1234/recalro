const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = path.join(__dirname);

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fall back to index.html for SPA-style routing
        fs.readFile(path.join(PUBLIC_DIR, '/index.html'), (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end('Server error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server error: ${err.code}`);
      }
      return;
    }

    if (ext === '.mp4') {
      const range = req.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match) {
          res.writeHead(416, { 'Content-Range': `bytes */${content.length}` });
          res.end();
          return;
        }

        const start = match[1] ? Number(match[1]) : Math.max(content.length - Number(match[2]), 0);
        const end = match[2] && match[1] ? Math.min(Number(match[2]), content.length - 1) : content.length - 1;
        if (start >= content.length || start > end) {
          res.writeHead(416, { 'Content-Range': `bytes */${content.length}` });
          res.end();
          return;
        }

        const chunk = content.subarray(start, end + 1);
        res.writeHead(206, {
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length,
          'Content-Range': `bytes ${start}-${end}/${content.length}`,
          'Content-Type': contentType,
        });
        res.end(chunk);
        return;
      }

      res.writeHead(200, { 'Accept-Ranges': 'bytes', 'Content-Length': content.length, 'Content-Type': contentType });
      res.end(content);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Recalro dev server running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop');
});