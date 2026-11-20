/* Server-verified management login. Google credentials never enter the browser. */
(() => {
  'use strict';
  const storageKey='uma.management.session';
  const state={frame:null,source:null,origin:null,channel:null,pending:new Map(),ready:null,token:null,onAuthenticated:null};
  const trustedOrigin=origin=>/^https:\/\/(?:script\.googleusercontent\.com|[a-z0-9-]+-script\.googleusercontent\.com)$/.test(origin);
  const validBackend=url=>{try{const u=new URL(url);return u.origin==='https://script.google.com'&&/^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname)&&!u.search&&!u.hash;}catch{return false;}};
  const publicMethods=new Set(['managementAuthParameters','loginManagement']);
  const methods=new Set([...publicMethods,'logoutManagement','getBootstrap','listApplications','getApplication','listEmails','listAudit','updateSettings','saveDecision','setReviewStatus','renewCorrection','resolveEmail','exportExcel','runSystemHealthCheck','getDocumentFile']);
  const show=message=>{document.getElementById('connectionMessage').textContent=message;};
  const readToken=()=>{try{return sessionStorage.getItem(storageKey)||null;}catch{return null;}};
  const saveToken=token=>{state.token=token;try{if(token)sessionStorage.setItem(storageKey,token);else sessionStorage.removeItem(storageKey);}catch{}};
  const showLogin=message=>{document.getElementById('connectionGate').classList.remove('hidden');document.getElementById('workspaceApp').setAttribute('inert','');show(message);};
  function connect(){
    if(state.ready)return state.ready;
    state.ready=(async()=>{
      const config=await fetch('/config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo leer la configuración del servicio.');return r.json();});
      if(!validBackend(config.appsScriptUrl))throw new Error('El servicio aún no está configurado.');
      state.channel=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
      return new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('El servicio no respondió. Vuelva a intentar en unos momentos.')),25000);
        window.addEventListener('message',event=>{
          const data=event.data;if(!trustedOrigin(event.origin)||!data||data.umaBridge!==1||data.channel!==state.channel)return;
          if(data.type==='ready'&&!state.source){state.source=event.source;state.origin=event.origin;state.source.postMessage({umaBridge:1,channel:state.channel,type:'ack'},state.origin);clearTimeout(timeout);resolve();}
          else if(data.type==='response'&&event.source===state.source&&event.origin===state.origin){const pending=state.pending.get(data.id);if(!pending)return;clearTimeout(pending.timeout);state.pending.delete(data.id);if(data.error)pending.reject(new Error(data.error));else pending.resolve(data.result);}
        });
        const url=new URL(config.appsScriptUrl);url.searchParams.set('mode','bridge');url.searchParams.set('origin',location.origin);url.searchParams.set('channel',state.channel);
        state.frame=document.createElement('iframe');state.frame.hidden=true;state.frame.title='Servicio de gestión';state.frame.referrerPolicy='no-referrer';state.frame.src=url.href;document.body.append(state.frame);
      });
    })();
    state.ready.catch(()=>{state.ready=null;});return state.ready;
  }
  async function call(method,...args){
    if(!methods.has(method))throw new Error('Operación no permitida');
    if(!publicMethods.has(method)&&!state.token)throw new Error('AUTH_REQUIRED: Inicie sesión para continuar.');
    await connect();
    try{return await new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timeout=setTimeout(()=>{state.pending.delete(id);reject(new Error('El servicio no respondió a tiempo. Actualice antes de repetir una decisión.'));},60000);state.pending.set(id,{resolve,reject,timeout});state.source.postMessage({umaBridge:1,channel:state.channel,type:'request',id,method,args,token:publicMethods.has(method)?undefined:state.token},state.origin);});}
    catch(error){if(error.message.includes('AUTH_REQUIRED:')){saveToken(null);showLogin('Su sesión terminó. Ingrese nuevamente.');}throw error;}
  }
  window.UMA_REMOTE={call,trustedOrigin,validBackend,
    async start(onAuthenticated){state.onAuthenticated=onAuthenticated;state.token=readToken();if(state.token){show('Cargando el panel…');try{await onAuthenticated();}catch(error){showLogin(error.message.replace('AUTH_REQUIRED: ',''));}}else show('Ingrese su usuario y contraseña para continuar.');},
    connected(){document.getElementById('connectionGate').classList.add('hidden');document.getElementById('workspaceApp').removeAttribute('inert');}
  };
  document.getElementById('managementLogin').onsubmit=async event=>{
    event.preventDefault();const button=document.getElementById('loginSubmit'),password=document.getElementById('loginPassword');button.disabled=true;show('Validando acceso…');
    try{
      const params=await call('managementAuthParameters');if(!/^[a-f0-9]{32}$/.test(params.salt)||params.iterations!==600000)throw new Error('Configuración de acceso inválida');
      const salt=Uint8Array.from(params.salt.match(/../g),v=>parseInt(v,16)),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password.value),'PBKDF2',false,['deriveBits']);
      const proof=Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:params.iterations,hash:'SHA-256'},key,256)),v=>v.toString(16).padStart(2,'0')).join('');
      const session=await call('loginManagement',{username:document.getElementById('loginUsername').value.trim(),proof});saveToken(session.token);password.value='';await state.onAuthenticated();
    }catch(error){showLogin(error.message.replace('AUTH_REQUIRED: ',''));}finally{button.disabled=false;}
  };
  document.getElementById('logoutManagement').onclick=async()=>{try{await call('logoutManagement');}catch{}finally{saveToken(null);location.reload();}};
})();
