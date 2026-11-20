(() => {
'use strict';
fetch('/config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo abrir el formulario.');return r.json();}).then(config=>{const url=new URL(config.applicationFormUrl);if(url.origin!=='https://docs.google.com'||!url.pathname.startsWith('/forms/'))throw new Error('Enlace de formulario inválido.');const link=document.getElementById('applicationForm');link.href=url.href;link.removeAttribute('aria-disabled');document.getElementById('applicationUnavailable').textContent='Si el formulario no se abre automáticamente, use el enlace.';location.replace(url.href);}).catch(error=>{document.getElementById('applicationUnavailable').textContent=error.message;});
})();
