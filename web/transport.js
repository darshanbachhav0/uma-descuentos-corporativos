/* Authenticated Google Apps Script iframe bridge. No credentials or records are persisted. */
(() => {
  'use strict';
  const state={frame:null,source:null,origin:null,channel:null,pending:new Map(),ready:null,config:null};
  const trustedOrigin=origin=>/^https:\/\/(?:script\.googleusercontent\.com|[a-z0-9-]+-script\.googleusercontent\.com)$/.test(origin);
  const validBackend=url=>{try{const u=new URL(url);return u.origin==='https://script.google.com'&&/^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname)&&!u.search&&!u.hash;}catch{return false;}};
  const channel=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
  const show=(message)=>{document.getElementById('connectionMessage').textContent=message;};
  const methods=new Set(['getBootstrap','listApplications','getApplication','listEmails','listAudit','updateSettings','saveDecision','setReviewStatus','renewCorrection','resolveEmail','exportExcel','runSystemHealthCheck']);
  function connect(){
    if(state.ready)return state.ready;
    state.ready=(async()=>{
      state.config=await fetch('/config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo leer la configuración del sitio.');return r.json();});
      if(!validBackend(state.config.appsScriptUrl))throw new Error('La conexión de Google está pendiente de configuración. El administrador debe autorizar y desplegar Apps Script.');
      const open=document.getElementById('authorizeGoogle');open.href=state.config.appsScriptUrl;open.classList.remove('hidden');
      state.channel=channel();
      return new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Abra la conexión de Google, autorice su cuenta de Tesorería y pulse Volver a conectar. Si el navegador bloquea cookies de terceros, use el panel de Google en su propia pestaña.')),20000);
        const receive=event=>{
          const data=event.data;
          if(!trustedOrigin(event.origin)||!data||data.umaBridge!==1||data.channel!==state.channel)return;
          if(data.type==='ready'&&!state.source){
            state.source=event.source;state.origin=event.origin;
            state.source.postMessage({umaBridge:1,channel:state.channel,type:'ack'},state.origin);clearTimeout(timeout);resolve();
          }else if(data.type==='response'&&event.source===state.source&&event.origin===state.origin){
            const pending=state.pending.get(data.id);if(!pending)return;
            clearTimeout(pending.timeout);state.pending.delete(data.id);
            if(data.error)pending.reject(new Error(data.error));else pending.resolve(data.result);
          }
        };
        window.addEventListener('message',receive);
        const u=new URL(state.config.appsScriptUrl);u.searchParams.set('mode','bridge');u.searchParams.set('origin',location.origin);u.searchParams.set('channel',state.channel);
        state.frame=document.createElement('iframe');state.frame.hidden=true;state.frame.title='Conexión protegida de Google';state.frame.referrerPolicy='no-referrer';state.frame.src=u.href;document.body.append(state.frame);
      });
    })();
    state.ready.catch(error=>{show(error.message);document.getElementById('connectionGate').classList.remove('hidden');});
    return state.ready;
  }
  window.UMA_REMOTE={
    async call(method,...args){
      if(!methods.has(method))throw new Error('Operación no permitida');await connect();
      return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timeout=setTimeout(()=>{state.pending.delete(id);reject(new Error('Google no respondió a tiempo. Actualice el expediente antes de repetir una decisión.'));},60000);state.pending.set(id,{resolve,reject,timeout});state.source.postMessage({umaBridge:1,channel:state.channel,type:'request',id,method,args},state.origin);});
    },
    connected(){document.getElementById('connectionGate').classList.add('hidden');document.getElementById('workspaceApp').removeAttribute('inert');},
    trustedOrigin,validBackend
  };
  document.getElementById('retryGoogle').onclick=()=>location.reload();
})();
