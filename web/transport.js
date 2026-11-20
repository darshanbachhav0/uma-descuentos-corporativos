/* Direct HTTPS management API. No Google iframe, Google cookies, or Google sign-in. */
(() => {
  'use strict';
  const storageKey='uma.management.session';
  const state={config:null,token:null,onAuthenticated:null,loginController:null,phase:''};
  const publicMethods=new Set(['managementAuthParameters','loginManagement']);
  const methods=new Set([...publicMethods,'logoutManagement','getBootstrap','listApplications','getApplication','listEmails','listAudit','updateSettings','saveDecision','setReviewStatus','renewCorrection','resolveEmail','exportExcel','runSystemHealthCheck','getDocumentFile','acknowledgeIssues','listUnlinkedSubmissions']);
  const show=message=>{const el=document.getElementById('connectionMessage');el.textContent=message;if(el.classList)el.classList.toggle('loading',/…$/.test(message));};
  const readToken=()=>{try{return sessionStorage.getItem(storageKey)||null;}catch{return null;}};
  const saveToken=token=>{state.token=token;try{if(token)sessionStorage.setItem(storageKey,token);else sessionStorage.removeItem(storageKey);}catch{}};
  const showLogin=message=>{document.getElementById('connectionGate').classList.remove('hidden');document.getElementById('workspaceApp').setAttribute('inert','');show(message);};
  const validApi=value=>{try{const u=new URL(value);return u.protocol==='https:'&&/^[a-z0-9-]+\.onrender\.com$/.test(u.hostname)&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash;}catch{return false;}};
  async function configuration(){
    if(state.config)return state.config;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{const response=await fetch('/config.json',{cache:'no-store',credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error('No se pudo leer la configuración del servicio.');const config=await response.json();if(!validApi(config.apiUrl))throw new Error('La conexión del servicio no está configurada.');state.config=config;return config;}finally{clearTimeout(timer);}
  }
  async function call(method,...args){
    if(!methods.has(method))throw new Error('Operación no permitida');
    if(!publicMethods.has(method)&&!state.token)throw new Error('AUTH_REQUIRED: Inicie sesión para continuar.');
    const controller=state.loginController||new AbortController(),timer=state.loginController?null:setTimeout(()=>controller.abort(),85000);
    try{
      const config=await configuration(),headers={'Content-Type':'application/json'};if(!publicMethods.has(method))headers.Authorization='Bearer '+state.token;
      const response=await fetch(config.apiUrl.replace(/\/$/,'')+'/rpc',{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:JSON.stringify({method,args}),signal:controller.signal});
      let payload;try{payload=await response.json();}catch{throw new Error('El servicio está iniciando o no está disponible. Vuelva a intentar.');}
      if(!response.ok||!payload.ok)throw new Error(payload.error||'No se pudo procesar la solicitud.');return payload.result;
    }catch(error){
      if(error.message.includes('AUTH_REQUIRED:')){saveToken(null);showLogin('Su sesión terminó. Ingrese nuevamente.');}
      if(error.name==='AbortError'||controller.signal.aborted)throw new Error('El servicio tardó demasiado en responder. Vuelva a intentar.');throw error;
    }finally{if(timer!==null)clearTimeout(timer);}
  }
  const cleanError=error=>error.message.replace('AUTH_REQUIRED: ','').replace(/^Error: /,'');
  window.UMA_REMOTE={call,validApi,
    async start(onAuthenticated){state.onAuthenticated=onAuthenticated;state.token=readToken();if(state.token){show('Cargando el panel…');try{await onAuthenticated();}catch(error){showLogin(cleanError(error));}}else show('Ingrese su usuario y contraseña para continuar.');
      // Wake the free API service before the user finishes typing; never send credentials here.
      configuration().then(config=>fetch(config.apiUrl.replace(/\/$/,'')+'/healthz',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(90000)})).catch(()=>{});
    },
    connected(){document.getElementById('connectionGate').classList.add('hidden');document.getElementById('workspaceApp').removeAttribute('inert');}
  };
  document.getElementById('managementLogin').onsubmit=async event=>{
    event.preventDefault();const button=document.getElementById('loginSubmit'),password=document.getElementById('loginPassword');button.disabled=true;state.phase='connecting';show('Conectando al servicio de gestión…');
    state.loginController=new AbortController();const deadline=setTimeout(()=>state.loginController?.abort(),90000),slow=setTimeout(()=>{if(state.phase==='connecting')show('El servicio está iniciando. El primer acceso puede tardar unos segundos…');},8000);
    try{
      const params=await call('managementAuthParameters');state.phase='checking';show('Validando usuario y contraseña…');if(!/^[a-f0-9]{32}$/.test(params.salt)||params.iterations!==600000)throw new Error('Configuración de acceso inválida');
      const salt=Uint8Array.from(params.salt.match(/../g),v=>parseInt(v,16)),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password.value),'PBKDF2',false,['deriveBits']);
      const proof=Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:params.iterations,hash:'SHA-256'},key,256)),v=>v.toString(16).padStart(2,'0')).join('');
      const session=await call('loginManagement',{username:document.getElementById('loginUsername').value.trim(),proof});saveToken(session.token);password.value='';state.phase='loading';show('Cargando solicitudes…');await state.onAuthenticated();
    }catch(error){showLogin(cleanError(error));}finally{clearTimeout(deadline);clearTimeout(slow);state.loginController=null;state.phase='';button.disabled=false;}
  };
  document.getElementById('logoutManagement').onclick=async()=>{try{await call('logoutManagement');}catch{}finally{saveToken(null);location.reload();}};
})();
