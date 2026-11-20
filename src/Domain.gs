function normalizeEmail_(value) { return String(value||'').trim().toLowerCase(); }
function validEmail_(value) { return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(String(value||'')) && String(value).length<=254; }
function cleanText_(value, max) { return String(value||'').trim().slice(0,max||1000); }
function escapeHtml_(value) { return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function sheetValue_(value) {
  if (value===null || value===undefined) return '';
  if (typeof value==='number' || typeof value==='boolean') return value;
  var s = String(value); return /^[=+\-@\t\r\n]/.test(s) || /^0\d+$/.test(s) ? "'"+s : s;
}
function validateApplication_(input, cfg) {
  var a = {};
  ['institutionalEmail','personalEmail'].forEach(function(k){a[k]=normalizeEmail_(input[k]);});
  assert_(validEmail_(a.institutionalEmail),'Correo institucional inválido');
  assert_(!a.personalEmail || validEmail_(a.personalEmail),'Correo personal inválido');
  var domains = String(cfg.INSTITUTIONAL_EMAIL_DOMAINS||'').split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
  assert_(!domains.length || domains.indexOf(a.institutionalEmail.split('@')[1])>=0,'Dominio institucional no permitido');
  ['identityType','identityNumber','name','school','discount','otherDiscount'].forEach(function(k){a[k]=cleanText_(input[k],k==='name'?180:250);});
  assert_(['DNI','CE','Pasaporte'].indexOf(a.identityType)>=0,'Tipo de documento inválido');
  assert_(a.identityType==='DNI'? /^\d{8}$/.test(a.identityNumber):/^[a-z0-9-]{5,20}$/i.test(a.identityNumber),'Número de documento inválido');
  assert_(a.name.length>=4,'Ingrese nombres y apellidos');
  assert_((cfg.schools||UMA.schools).indexOf(a.school)>=0,'Escuela profesional inválida');
  assert_(UMA.discounts.indexOf(a.discount)>=0,'Convenio inválido');
  assert_(a.discount!=='Otro' || a.otherDiscount.length>=3,'Especifique el otro convenio');
  a.recipient=a.institutionalEmail || a.personalEmail;
  return a;
}
function validateDecision_(a, d) {
  assert_(Number(d.version)===Number(a.version),'El expediente cambió. Actualice antes de continuar.');
  assert_(!a.processingError,'Resuelva el error de documentos antes de revisar.');
  assert_(a.status!=='APLICADA_SIGU','La solicitud ya fue aplicada en SIGU');
  assert_(a.status!=='OBSERVADA','Espere la subsanación antes de emitir otra decisión');
  assert_(['APPROVED','OBSERVED'].indexOf(d.decision)>=0,'Decisión inválida');
  if (d.decision==='APPROVED') assert_(d.siguConfirmed===true,'Confirme que el descuento ya fue registrado en SIGU');
  else {
    assert_(UMA.categories.indexOf(d.category)>=0,'Seleccione una observación');
    assert_(cleanText_(d.observation).length>=10,'Describa la observación (mínimo 10 caracteres)');
    assert_(cleanText_(d.instructions).length>=10,'Indique cómo subsanar (mínimo 10 caracteres)');
  }
}
function filtered_(rows, f) {
  f=f||{}; var q=String(f.query||'').toLowerCase();
  return rows.filter(function(a){
    return (!q || [a.id,a.name,a.identityNumber,a.institutionalEmail].join(' ').toLowerCase().indexOf(q)>=0) &&
      (!f.status || a.status===f.status) && (!f.discount || a.discount===f.discount) &&
      (!f.school || a.school===f.school) && (!f.pendingOnly || ['RECIBIDA','EN_REVISION','CORRECCION_RECIBIDA','VALIDADA_PENDIENTE_SIGU'].indexOf(a.status)>=0) && (!f.from || String(a.createdAt).slice(0,10)>=f.from) &&
      (!f.to || String(a.createdAt).slice(0,10)<=f.to);
  }).sort(function(a,b){ return String(b.createdAt).localeCompare(String(a.createdAt)); });
}
function statistics_(rows, emails) {
  var s={total:rows.length,pending:0,observed:0,applied:0,byDiscount:{},bySchool:{},byDay:{},byMonth:{},emailSent:0,emailPending:0,emailUncertain:0,averageReviewHours:0}; var hours=[];
  rows.forEach(function(a){
    if (['RECIBIDA','EN_REVISION','CORRECCION_RECIBIDA','VALIDADA_PENDIENTE_SIGU'].indexOf(a.status)>=0) s.pending++;
    if(a.status==='OBSERVADA')s.observed++; if(a.status==='APLICADA_SIGU')s.applied++;
    [['byDiscount',a.discount],['bySchool',a.school],['byDay',String(a.createdAt).slice(0,10)],['byMonth',String(a.createdAt).slice(0,7)]].forEach(function(p){s[p[0]][p[1]]=(s[p[0]][p[1]]||0)+1;});
    if(a.reviewedAt)hours.push(Math.max(0,(Date.parse(a.reviewedAt)-Date.parse(a.createdAt))/3600000));
  });
  (emails||[]).forEach(function(e){if(e.status==='SENT')s.emailSent++;else if(e.status==='UNCERTAIN'||e.status==='SENDING')s.emailUncertain++;else if(e.status==='PENDING')s.emailPending++;});
  s.averageReviewHours=hours.length?Math.round(hours.reduce(function(a,b){return a+b;},0)/hours.length*10)/10:0; return s;
}
