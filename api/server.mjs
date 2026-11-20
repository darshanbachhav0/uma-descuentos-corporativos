// Browser-independent API relay. No Google cookies, OAuth tokens, or student data are stored here.
import http from 'node:http';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const config=JSON.parse(fs.readFileSync(new URL('../deploy/public-config.json',import.meta.url),'utf8'));
const publicMethods=new Set(['managementAuthParameters','loginManagement']);
const methods=new Set([...publicMethods,'logoutManagement','getBootstrap','listApplications','getApplication','listEmails','listAudit','updateSettings','saveDecision','setReviewStatus','renewCorrection','resolveEmail','exportExcel','runSystemHealthCheck','getDocumentFile','acknowledgeIssues','listUnlinkedSubmissions','sendEmailNow']);
export function createApiServer({frontendOrigin='https://uma-descuentos-corporativos.onrender.com',appsScriptUrl=config.appsScriptUrl,fetchImpl=fetch,timeoutMs=55000}={}){
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(appsScriptUrl))throw new Error('Invalid Google service URL');
  return http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Vary','Origin');
    const reply=(status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(payload));};
    const path=new URL(req.url,'http://localhost').pathname;
    if(req.headers.origin===frontendOrigin)res.setHeader('Access-Control-Allow-Origin',frontendOrigin);
    if(path==='/healthz'&&req.method==='GET')return reply(200,{ok:true,service:'uma-management-api'});
    if(req.headers.origin!==frontendOrigin)return reply(403,{ok:false,error:'Origen no autorizado'});
    if(path!=='/rpc')return reply(404,{ok:false,error:'Ruta no encontrada'});
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Max-Age','600');res.writeHead(204);return res.end();}
    if(req.method!=='POST')return reply(405,{ok:false,error:'Método no permitido'});
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(415,{ok:false,error:'Se requiere JSON'});
    if(Number(req.headers['content-length']||0)>1048576){req.resume();return reply(413,{ok:false,error:'Petición demasiado grande'});}
    let bytes=0,chunks=[];
    try{
      for await(const chunk of req){bytes+=chunk.length;if(bytes>1048576){req.resume();return reply(413,{ok:false,error:'Petición demasiado grande'});}chunks.push(chunk);}
      let request;try{request=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply(400,{ok:false,error:'JSON inválido'});}
      if(!request||!methods.has(request.method)||!Array.isArray(request.args)||request.args.length>4)return reply(400,{ok:false,error:'Operación no permitida'});
      const token=(req.headers.authorization||'').replace(/^Bearer /,'');
      if(!publicMethods.has(request.method)&&!/^[a-f0-9]{64}$/.test(token))return reply(401,{ok:false,error:'AUTH_REQUIRED: Inicie sesión para continuar.'});
      const upstream=await fetchImpl(appsScriptUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:frontendOrigin,method:request.method,args:request.args,token:publicMethods.has(request.method)?undefined:token}),credentials:'omit',redirect:'follow',signal:AbortSignal.timeout(timeoutMs)});
      if(!upstream.ok)throw new Error('Upstream unavailable');
      const text=await upstream.text();if(text.length>24*1024*1024)throw new Error('Response too large');
      let result;try{result=JSON.parse(text);}catch{throw new Error('Invalid upstream response');}
      if(!result||typeof result.ok!=='boolean')throw new Error('Invalid upstream envelope');
      if(!result.ok){const message=String(result.error||'No se pudo procesar la solicitud');return reply(message.includes('AUTH_REQUIRED')||message.includes('incorrectos')?401:message.includes('15 minutos')?429:400,{ok:false,error:message});}
      return reply(200,result);
    }catch(error){if(!res.headersSent)reply(503,{ok:false,error:'El servicio no respondió. Vuelva a intentar en unos momentos.'});}
  });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const server=createApiServer({frontendOrigin:process.env.FRONTEND_ORIGIN||undefined,appsScriptUrl:process.env.UMA_APPS_SCRIPT_URL||config.appsScriptUrl});
  server.requestTimeout=65000;server.headersTimeout=15000;
  server.listen(Number(process.env.PORT)||10000,'0.0.0.0',()=>console.log('UMA management API ready'));
}
