const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {createSystem}=require('./harness.cjs');
test('bridge permits exact configured HTTPS origins only',()=>{const s=createSystem();s.props.FRONTEND_ORIGINS='https://uma.onrender.com,https://discounts.uma.edu.pe';for(const origin of ['https://uma.onrender.com','https://discounts.uma.edu.pe'])assert.equal(s.ctx.allowedFrontend_(origin),true);for(const origin of ['https://uma.onrender.com.evil.test','https://uma.onrender.com/path','http://uma.onrender.com','null','*','https://evil.test'])assert.equal(s.ctx.allowedFrontend_(origin),false);});
test('bridge rejects arbitrary function names and missing reviewer identity',()=>{const s=createSystem();s.props.FRONTEND_ORIGINS='https://uma.onrender.com';for(const method of ['initializeProject','processEmailQueue','constructor','__proto__','html_'])assert.throws(()=>s.ctx.bridgeCall({origin:'https://uma.onrender.com',method,args:[]}));assert.throws(()=>s.ctx.bridgeCall({origin:'https://evil.test',method:'listApplications',args:[]}));s.setIdentity('intruder@example.edu');assert.throws(()=>s.ctx.bridgeCall({origin:'https://uma.onrender.com',method:'listApplications',args:[]}));});
test('bridge executes allowed reads under reviewer authorization',()=>{const s=createSystem();s.props.FRONTEND_ORIGINS='https://uma.onrender.com';const result=s.ctx.bridgeCall({origin:'https://uma.onrender.com',method:'listApplications',args:[{},1,20]});assert.equal(result.total,0);});
function transport(token='a'.repeat(64),rpcResponse=async()=>({ok:true,result:{total:0}})){
 const nodes={connectionMessage:{},connectionGate:{classList:{remove(){},add(){}}},workspaceApp:{setAttribute(){},removeAttribute(){}},managementLogin:{},logoutManagement:{},loginSubmit:{disabled:false},loginPassword:{value:'example password'},loginUsername:{value:'test.manager'}};
 const timers=new Map(),calls=[],storage=new Map(token?[['uma.management.session',token]]:[]);let n=0;
 const local=new Map();
 const context={AbortController,AbortSignal,TextEncoder,localStorage:{getItem:key=>local.get(key)??null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},sessionStorage:{getItem:key=>storage.get(key),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},URL,Uint8Array,Set,Map,Promise,Error,crypto:crypto.webcrypto,location:{origin:'https://uma.onrender.com',reload(){}},fetch:async(url,options={})=>{calls.push({url,options});if(url==='/config.json')return {ok:true,json:async()=>({apiUrl:'https://uma-api.onrender.com'})};if(url.endsWith('/healthz'))return {ok:true};return {ok:true,json:async()=>rpcResponse(url,options)};},setTimeout:(f,ms)=>{timers.set(++n,{f,ms});return n;},clearTimeout:id=>timers.delete(id),document:{getElementById:id=>nodes[id],createElement:()=>{throw new Error('A login must not create an iframe');}}};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('web/transport.js','utf8'),context);
 return {context,nodes,timers,calls,storage,local,async start(){await context.UMA_REMOTE.start(async()=>{});}};
}

test('static API validates HTTPS API origins and never creates a Google frame',async()=>{const t=transport();for(const value of ['https://uma-api.onrender.com','https://uma-api.onrender.com/'])assert.equal(t.context.UMA_REMOTE.validApi(value),true);for(const value of ['http://uma-api.onrender.com','https://evil.test','https://uma-api.onrender.com.evil.test','https://uma-api.onrender.com/path'])assert.equal(t.context.UMA_REMOTE.validApi(value),false);await t.start();await t.context.UMA_REMOTE.call('listApplications',{},1,20);const request=t.calls.find(c=>c.url.endsWith('/rpc'));assert.equal(request.options.credentials,'omit');assert.equal(request.options.headers.Authorization,'Bearer '+'a'.repeat(64));assert.ok(!JSON.stringify(t.calls).includes('google.com'));assert.equal(t.timers.size,0);});
test('static API does not send unauthenticated reads and clears an expired session',async()=>{const missing=transport(null);await missing.start();await assert.rejects(missing.context.UMA_REMOTE.call('listApplications'),/AUTH_REQUIRED/);assert.equal(missing.calls.filter(c=>c.url.endsWith('/rpc')&&!c.options.body.includes('managementAuthParameters')).length,0);const expired=transport('a'.repeat(64),async()=>({ok:false,error:'AUTH_REQUIRED: expired'}));await expired.start();await assert.rejects(expired.context.UMA_REMOTE.call('listApplications'),/AUTH_REQUIRED/);assert.equal(expired.storage.size,0);assert.match(expired.nodes.connectionMessage.textContent,/sesión terminó/);});
test('a stalled login is aborted and always re-enables the login button',async()=>{const t=transport(null,async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const error=new Error('aborted');error.name='AbortError';reject(error);},{once:true})));await t.start();const login=t.nodes.managementLogin.onsubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));assert.equal(t.nodes.loginSubmit.disabled,true);const deadline=[...t.timers.values()].find(timer=>timer.ms===90000);assert.ok(deadline);deadline.f();await login;assert.equal(t.nodes.loginSubmit.disabled,false);assert.match(t.nodes.connectionMessage.textContent,/demasiado/);assert.equal(t.timers.size,0);});

test('static site publishes the exact original blank PDF and excludes simulated applicants',()=>{const original=fs.readFileSync('reference/FORMATO 1_FICHA DE EVALUACION SOCIOECONOMICA_2027-I.pdf'),published=fs.readFileSync('web-dist/ficha-socioeconomica-2027-I.pdf');assert.equal(crypto.createHash('sha256').update(original).digest('hex'),crypto.createHash('sha256').update(published).digest('hex'));for(const f of fs.readdirSync('web-dist').filter(f=>/\.(html|js|json)$/.test(f)))assert.ok(!fs.readFileSync('web-dist/'+f,'utf8').includes('Valeria Rojas Mendoza'));assert.ok(!fs.existsSync('web-dist/Code.gs'));});

const methodsOf=t=>t.calls.filter(c=>c.url.endsWith('/rpc')).map(c=>JSON.parse(c.options.body).method);
test('login with saved parameters is a single request to the server',async()=>{
  const t=transport(null,async(url,options)=>{const body=JSON.parse(options.body);return body.method==='loginManagement'?{ok:true,result:{token:'b'.repeat(64),expiresAt:1}}:{ok:true,result:{salt:'1'.repeat(32),iterations:600000}};});
  t.local.set('uma.management.params',JSON.stringify({salt:'1'.repeat(32),iterations:600000}));
  await t.context.UMA_REMOTE.start(async()=>{});
  await t.nodes.managementLogin.onsubmit({preventDefault(){}});
  assert.deepEqual(methodsOf(t),['loginManagement']);
  assert.equal(t.storage.get('uma.management.session'),'b'.repeat(64));
  assert.equal(t.nodes.loginPassword.value,'');
});
test('outdated saved parameters are refreshed once and the login retried',async()=>{
  const t=transport(null,async(url,options)=>{const body=JSON.parse(options.body);if(body.method==='managementAuthParameters')return {ok:true,result:{salt:'2'.repeat(32),iterations:600000}};const fresh=body.args[0].proof;return t.attempts++===0?{ok:false,error:'Usuario o contraseña incorrectos'}:{ok:true,result:{token:'c'.repeat(64),expiresAt:1,proof:fresh}};});
  t.attempts=0;t.local.set('uma.management.params',JSON.stringify({salt:'1'.repeat(32),iterations:600000}));
  await t.context.UMA_REMOTE.start(async()=>{});
  await t.nodes.managementLogin.onsubmit({preventDefault(){}});
  assert.deepEqual(methodsOf(t),['loginManagement','managementAuthParameters','loginManagement']);
  assert.equal(JSON.parse(t.local.get('uma.management.params')).salt,'2'.repeat(32));
  assert.equal(t.storage.get('uma.management.session'),'c'.repeat(64));
});

test('logout shows a closing screen, never waits long for the server and confirms on the login screen',async()=>{
  const t=transport('a'.repeat(64),async()=>new Promise(()=>{}));
  let overlay=false;t.nodes.logoutOverlay={classList:{remove(){overlay=true;},add(){}}};t.nodes.logoutManagement.disabled=false;
  t.context.document.querySelectorAll=()=>[];
  await t.start();
  const done=t.nodes.logoutManagement.onclick();
  await new Promise(r=>setImmediate(r));
  assert.ok(overlay);assert.equal(t.nodes.logoutManagement.disabled,true);
  const cap=[...t.timers.values()].find(timer=>timer.ms===6000);assert.ok(cap,'logout waits at most 6 s');cap.f();
  await done;
  assert.equal(t.storage.has('uma.management.session'),false);
  assert.equal(t.storage.get('uma.management.loggedOut'),'1');
  const next=transport(null);next.storage.set('uma.management.loggedOut','1');await next.start();
  assert.match(next.nodes.connectionMessage.textContent,/Sesión cerrada correctamente/);
  assert.equal(next.storage.has('uma.management.loggedOut'),false);
});
