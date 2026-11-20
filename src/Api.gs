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
function getBootstrap() {
  var actor=reviewer_(),c=config_();return {actor:actor,isAdmin:actor===UMA.owner||!!UMA_REQUEST_AUTH_,owner:UMA.owner,period:c.ACADEMIC_PERIOD,schools:UMA.schools,discounts:UMA.discounts,categories:UMA.categories,states:UMA.states,emailEnabled:c.EMAIL_NOTIFICATION_ENABLED==='true',domains:c.INSTITUTIONAL_EMAIL_DOMAINS,spreadsheet:'https://docs.google.com/spreadsheets/d/'+c.SPREADSHEET_ID+'/edit',studentForm:FormApp.openById(c.GOOGLE_FORM_ID).getPublishedUrl()};
}
function listApplications(filter,page,pageSize) {
  reviewer_();var all=rows_('Solicitudes'),selected=filtered_(all,filter),size=Math.min(100,Math.max(10,Number(pageSize)||20)),p=Math.max(1,Number(page)||1);
  return {rows:selected.slice((p-1)*size,p*size),total:selected.length,page:p,pageSize:size,stats:statistics_(all,rows_('Correos'))};
}
function getApplication(id) {
  reviewer_();var a=application_(id);return {application:a,documents:rows_('Documentos').filter(function(d){return d.applicationId===id;}),history:rows_('Historial_Estados').filter(function(h){return h.applicationId===id;}),observations:rows_('Observaciones').filter(function(o){return o.applicationId===id;}),emails:rows_('Correos').filter(function(m){return m.applicationId===id;}).map(publicEmail_)};
}
function publicEmail_(m){var safe=Object.assign({},m);delete safe.body;return safe;}
function listEmails(){reviewer_();return rows_('Correos').slice(-300).reverse().map(publicEmail_);}
function listAudit(){reviewer_(true);return {audit:rows_('Auditoria').slice(-200).reverse(),errors:rows_('Errores').slice(-100).reverse()};}
function updateSettings(settings){var actor=reviewer_(true);return locked_(function(){
  assert_(settings&&typeof settings==='object','Configuración inválida');var p=properties_();
  if(settings.emailEnabled!==undefined)p.setProperty('EMAIL_NOTIFICATION_ENABLED',settings.emailEnabled===true?'true':'false');
  if(settings.domains!==undefined){var d=String(settings.domains).split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);assert_(d.every(function(s){return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s);}), 'Dominios inválidos');p.setProperty('INSTITUTIONAL_EMAIL_DOMAINS',d.join(','));}
  audit_(actor,'SETTINGS_UPDATED','','Notificaciones/dominios');return {ok:true};
});}
