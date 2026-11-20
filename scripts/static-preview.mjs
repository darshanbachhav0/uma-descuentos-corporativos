import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('web-dist'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.pdf':'application/pdf','.txt':'text/plain'};
http.createServer((req,res)=>{
  let route=new URL(req.url,'http://localhost').pathname;
  if(route==='/')route='/index.html';if(route==='/estudiantes')route='/estudiantes.html';if(route==='/tesoreria')route='/index.html';
  const file=path.resolve(root,'.'+route);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
}).listen(4174,'127.0.0.1',()=>console.log('Render static preview: http://127.0.0.1:4174'));
