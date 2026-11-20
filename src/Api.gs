function doPost(e){
  var response;
  try{
    assert_(e&&e.postData&&typeof e.postData.contents==='string'&&e.postData.contents.length<=1048576,'Petición inválida');
    assert_(config_().MANAGEMENT_AUTH_ENABLED==='true','El acceso de gestión no está configurado');
    response={ok:true,result:bridgeCall(JSON.parse(e.postData.contents))};
  }catch(error){response={ok:false,error:String(error.message||'No se pudo procesar la solicitud')};}
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  if(e && e.parameter && e.parameter.mode==='setup'){
    try{setupOwner_();return HtmlService.createTemplate(html_('Setup')).evaluate().setTitle('Configurar UMA · Google Workspace').addMetaTag('viewport','width=device-width, initial-scale=1');}catch(error){return HtmlService.createHtmlOutput('<p>Solo la cuenta propietaria puede configurar el sistema.</p>');}
  }
  if(e && e.parameter && e.parameter.mode==='bridge'){
    try{return bridgePage_(e);}catch(error){return HtmlService.createHtmlOutput('<p>Origen de conexión no autorizado.</p>');}
  }
  var origin=String(config_().FRONTEND_ORIGINS||'').split(',')[0];
  return HtmlService.createHtmlOutput('<!doctype html><html lang="es"><meta charset="utf-8"><title>Tesorería UMA</title><body style="font:18px Arial;padding:48px"><h1>Tesorería UMA</h1><p><a href="'+escapeHtml_(allowedFrontend_(origin)?origin:'#')+'">Abrir plataforma de gestión</a></p></body></html>');
}
function html_(name){return typeof UMA_UI_!=='undefined'?UMA_UI_[name]:HtmlService.createHtmlOutputFromFile(name).getContent();}
function include_(name){return html_(name);}
/** Suggested observation text per category (what is wrong and how to fix it). Reviewers can edit it. */
var UMA_TEMPLATES_ = {
  'Ficha socioeconómica incompleta':'La ficha socioeconómica presentada tiene campos sin completar. Complete todos los campos de la ficha socioeconómica a mano, fírmela y vuelva a adjuntarla en PDF o fotografía legible.',
  'Falta firma del estudiante':'La ficha socioeconómica no tiene la firma del estudiante. Firme la ficha socioeconómica y vuelva a adjuntarla completa en PDF o fotografía legible.',
  'Documento ilegible':'Uno o más documentos no se pueden leer con claridad. Vuelva a escanear o fotografiar los documentos con buena luz, sin cortes, y adjúntelos en PDF/JPG/PNG.',
  'Falta documento sustentatorio':'No se adjuntó el documento que sustenta el convenio seleccionado. Adjunte el documento sustentatorio vigente del convenio (constancia, carné o documento emitido por la institución).',
  'Datos incorrectos':'Los datos registrados no coinciden con los documentos presentados. Revise su número de documento, nombres y escuela, y vuelva a enviar el formulario con los datos correctos.',
  'Documento no corresponde':'El documento adjunto no corresponde a lo solicitado. Adjunte la ficha socioeconómica 2027-I y el sustento del convenio seleccionado.',
  'Información incompleta':'La solicitud no contiene toda la información requerida. Complete la información faltante y vuelva a enviar el formulario con todos los documentos.',
  'Otro':''
};
function studentFormUrl_(c){
  // Opening the form costs ~1 s; the published URL rarely changes, so keep it for six hours.
  var cache=CacheService.getScriptCache(),key='UMA_FORM_URL_'+c.GOOGLE_FORM_ID,url=cache.get(key);
  if(!url){url=FormApp.openById(c.GOOGLE_FORM_ID).getPublishedUrl();cache.put(key,url,21600);}
  return url;
}
function getBootstrap() {
  var actor=reviewer_(),c=config_();return {actor:actor,isAdmin:actor===UMA.owner||!!UMA_REQUEST_AUTH_,owner:UMA.owner,period:c.ACADEMIC_PERIOD,schools:UMA.schools,discounts:UMA.discounts,categories:UMA.categories,templates:UMA_TEMPLATES_,states:UMA.states,pendingStates:UMA.pendingStates,reviewStates:UMA.reviewStates,emailEnabled:c.EMAIL_NOTIFICATION_ENABLED==='true',receiptEnabled:c.RECEIPT_EMAIL_ENABLED==='true',domains:c.INSTITUTIONAL_EMAIL_DOMAINS,spreadsheet:'https://docs.google.com/spreadsheets/d/'+c.SPREADSHEET_ID+'/edit',studentForm:studentFormUrl_(c)};
}
var UMA_LIST_FIELDS_ = ['id','createdAt','lastSubmissionAt','name','identityType','identityNumber','institutionalEmail','school','discount','otherDiscount','status','revision','version','submissions','issues','processingError','emailStatus'];
function listApplications(filter,page,pageSize) {
  reviewer_();var all=rows_('Solicitudes'),selected=filtered_(all,filter),size=Math.min(100,Math.max(10,Number(pageSize)||20)),p=Math.max(1,Number(page)||1);
  var stats=statistics_(all,rows_('Correos'));
  // Responses that failed before any application existed would otherwise be invisible.
  stats.unlinked=rows_('Eventos').filter(function(e){return e.status!=='DONE'&&!e.applicationId;}).length;
  // Send only the columns the table shows; the full record is loaded when a case is opened.
  var rows=selected.slice((p-1)*size,p*size).map(function(a){var o={};UMA_LIST_FIELDS_.forEach(function(k){o[k]=a[k];});return o;});
  return {rows:rows,ids:selected.slice(0,500).map(function(a){return a.id;}),total:selected.length,page:p,pageSize:size,stats:stats};
}
function getApplication(id) {
  reviewer_();var a=application_(id);return {application:a,
    documents:rows_('Documentos').filter(function(d){return d.applicationId===id;}).sort(function(x,y){return Number(y.revision)-Number(x.revision)||String(x.kind).localeCompare(String(y.kind));}),
    submissions:rows_('Eventos').filter(function(e){return e.applicationId===id;}).map(function(e){return {revision:e.revision,status:e.status,timestamp:e.timestamp,error:e.status==='DONE'?'':e.error,correction:e.formId===config_().CORRECTION_FORM_ID};}).sort(function(x,y){return Number(y.revision)-Number(x.revision);}),
    history:rows_('Historial_Estados').filter(function(h){return h.applicationId===id;}),observations:rows_('Observaciones').filter(function(o){return o.applicationId===id;}),emails:rows_('Correos').filter(function(m){return m.applicationId===id;}).map(publicEmail_)};
}
/** Treasury confirms it has seen the alerts of the latest submission. */
function acknowledgeIssues(id,version){
  var actor=reviewer_();return locked_(function(){var a=application_(id);assert_(Number(a.version)===Number(version),'El expediente cambió. Actualice antes de continuar.');
    assert_(a.issues,'No hay alertas pendientes');var detail=a.issues;a.issues='';a.version=Number(a.version)+1;saveApplication_(a);audit_(actor,'ISSUES_ACKNOWLEDGED',id,String(detail).slice(0,1000));return {version:a.version};});
}
/** Submissions whose processing failed before they could be linked to any application. */
function listUnlinkedSubmissions(){
  reviewer_();return rows_('Eventos').filter(function(e){return e.status!=='DONE'&&!e.applicationId;}).map(function(e){return {key:e.key,timestamp:e.timestamp,attempts:e.attempts,error:e.error,retryAt:e.retryAt};});
}
function publicEmail_(m){var safe=Object.assign({},m);delete safe.body;return safe;}
function listEmails(){reviewer_();return rows_('Correos').slice(-300).reverse().map(publicEmail_);}
function listAudit(){reviewer_(true);return {audit:rows_('Auditoria').slice(-200).reverse(),errors:rows_('Errores').slice(-100).reverse()};}
function updateSettings(settings){var actor=reviewer_(true);return locked_(function(){
  assert_(settings&&typeof settings==='object','Configuración inválida');var p=properties_();
  if(settings.emailEnabled!==undefined){p.setProperty('EMAIL_NOTIFICATION_ENABLED',settings.emailEnabled===true?'true':'false');if(settings.emailEnabled===true)markMailQueue_();}
  if(settings.receiptEnabled!==undefined)p.setProperty('RECEIPT_EMAIL_ENABLED',settings.receiptEnabled===true?'true':'false');
  if(settings.domains!==undefined){var d=String(settings.domains).split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);assert_(d.every(function(s){return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s);}), 'Dominios inválidos');p.setProperty('INSTITUTIONAL_EMAIL_DOMAINS',d.join(','));}
  audit_(actor,'SETTINGS_UPDATED','','Notificaciones/dominios');return {ok:true};
});}
