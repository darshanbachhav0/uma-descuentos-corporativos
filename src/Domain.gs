function normalizeEmail_(value) { return String(value||'').trim().toLowerCase(); }
function validEmail_(value) { return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(String(value||'')) && String(value).length<=254; }
function cleanText_(value, max) { return String(value||'').trim().slice(0,max||1000); }
function escapeHtml_(value) { return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function sheetValue_(value) {
  if (value===null || value===undefined) return '';
  if (typeof value==='number' || typeof value==='boolean') return value;
  var s = String(value); return /^[=+\-@\t\r\n]/.test(s) || /^0\d+$/.test(s) ? "'"+s : s;
}
/**
 * Normalizes a form submission without discarding it. Every problem is returned in `issues` so the
 * submission still reaches Treasury (grouped by institutional email) instead of failing silently.
 */
function inspectApplication_(input, cfg) {
  var a = {}, issues = [];
  function check(ok, message) { if (!ok) issues.push(message); }
  ['institutionalEmail','personalEmail'].forEach(function(k){a[k]=normalizeEmail_(input[k]);});
  check(validEmail_(a.institutionalEmail),'Correo institucional inválido');
  check(!a.personalEmail || validEmail_(a.personalEmail),'Correo personal inválido');
  var domains = String(cfg.INSTITUTIONAL_EMAIL_DOMAINS||'').split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
  check(!domains.length || domains.indexOf(a.institutionalEmail.split('@')[1])>=0,'Dominio institucional no permitido');
  ['identityType','identityNumber','name','school','discount','otherDiscount'].forEach(function(k){a[k]=cleanText_(input[k],k==='name'?180:250);});
  check(['DNI','CE','Pasaporte'].indexOf(a.identityType)>=0,'Tipo de documento inválido');
  check(a.identityType==='DNI'? /^\d{8}$/.test(a.identityNumber):/^[a-z0-9-]{5,20}$/i.test(a.identityNumber),'Número de documento inválido'+(a.identityNumber?' ('+a.identityNumber+')':''));
  check(a.name.length>=4,'Ingrese nombres y apellidos');
  check((cfg.schools||UMA.schools).indexOf(a.school)>=0,'Escuela profesional inválida');
  check(UMA.discounts.indexOf(a.discount)>=0,'Convenio inválido');
  check(a.discount!=='Otro' || a.otherDiscount.length>=3,'Especifique el otro convenio');
  a.recipient = validEmail_(a.institutionalEmail) ? a.institutionalEmail : (validEmail_(a.personalEmail) ? a.personalEmail : '');
  return {data:a, issues:issues};
}
function validateApplication_(input, cfg) {
  var result = inspectApplication_(input, cfg);
  assert_(!result.issues.length, result.issues[0]);
  return result.data;
}
/** One application per student and period: the institutional email groups every submission. */
function studentKey_(a) {
  var email = normalizeEmail_(a.institutionalEmail);
  if (email) return 'email:' + email;
  if (a.personalEmail) return 'email:' + normalizeEmail_(a.personalEmail);
  return 'id:' + String(a.identityType||'') + ':' + String(a.identityNumber||'');
}
/** Peru has no daylight saving time: Lima is always UTC-5. */
function limaDate_(value) {
  var text = String(value||''); if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  var t = Date.parse(text); if (isNaN(t)) return text.slice(0,10);
  return new Date(t - 5*3600000).toISOString().slice(0,10);
}
function needsAttention_(a) { return !!(a.issues || a.processingError); }
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
  }
}
function filtered_(rows, f) {
  f=f||{}; var q=String(f.query||'').toLowerCase().trim();
  return rows.filter(function(a){
    var day=limaDate_(a.lastSubmissionAt||a.createdAt);
    return (!q || [a.id,a.name,a.identityNumber,a.institutionalEmail,a.personalEmail].join(' ').toLowerCase().indexOf(q)>=0) &&
      (!f.status || a.status===f.status) && (!f.discount || a.discount===f.discount) &&
      (!f.school || a.school===f.school) &&
      (!f.pendingOnly || UMA.pendingStates.indexOf(a.status)>=0) &&
      (!f.queue || (f.queue==='review' && UMA.reviewStates.indexOf(a.status)>=0) || (f.queue==='waiting' && a.status==='OBSERVADA') || (f.queue==='attention' && needsAttention_(a))) &&
      (!f.from || day>=f.from) && (!f.to || day<=f.to);
  }).sort(function(a,b){
    if(f.pendingOnly){var ra=UMA.reviewStates.indexOf(a.status)>=0?0:1,rb=UMA.reviewStates.indexOf(b.status)>=0?0:1;if(ra!==rb)return ra-rb;}
    var ta=String(a.lastSubmissionAt||a.createdAt), tb=String(b.lastSubmissionAt||b.createdAt);
    return tb.localeCompare(ta);
  });
}
function statistics_(rows, emails) {
  var s={total:rows.length,pending:0,toReview:0,observed:0,applied:0,attention:0,byDiscount:{},bySchool:{},byDay:{},byMonth:{},emailSent:0,emailPending:0,emailUncertain:0,averageReviewHours:0}; var hours=[];
  rows.forEach(function(a){
    if (UMA.pendingStates.indexOf(a.status)>=0) s.pending++;
    if (UMA.reviewStates.indexOf(a.status)>=0) s.toReview++;
    if(a.status==='OBSERVADA')s.observed++; if(a.status==='APLICADA_SIGU')s.applied++;
    if(needsAttention_(a))s.attention++;
    var day=limaDate_(a.createdAt);
    [['byDiscount',a.discount],['bySchool',a.school],['byDay',day],['byMonth',day.slice(0,7)]].forEach(function(p){s[p[0]][p[1]]=(s[p[0]][p[1]]||0)+1;});
    if(a.reviewedAt)hours.push(Math.max(0,(Date.parse(a.reviewedAt)-Date.parse(a.createdAt))/3600000));
  });
  (emails||[]).forEach(function(e){if(e.status==='SENT')s.emailSent++;else if(e.status==='UNCERTAIN'||e.status==='SENDING')s.emailUncertain++;else if(e.status==='PENDING')s.emailPending++;});
  s.averageReviewHours=hours.length?Math.round(hours.reduce(function(a,b){return a+b;},0)/hours.length*10)/10:0; return s;
}
