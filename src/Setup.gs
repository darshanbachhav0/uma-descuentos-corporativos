/** Run once as the owner. Safe to run again; existing resources are retained. */
function initializeProject() {
  owner_(); return locked_(function(){
    var p=properties_(),c=config_();
    if(!c.CORRECTION_SECRET)p.setProperty('CORRECTION_SECRET',Utilities.getUuid()+Utilities.getUuid());
    if(!c.SPREADSHEET_ID)p.setProperty('SPREADSHEET_ID',SpreadsheetApp.create('UMA — Control de Descuentos Corporativos').getId());
    if(!c.ROOT_DRIVE_FOLDER_ID)p.setProperty('ROOT_DRIVE_FOLDER_ID',DriveApp.createFolder('UMA_DESCUENTOS_CORPORATIVOS').getId());
    c=config_();
    if(!c.EXPORT_FOLDER_ID)p.setProperty('EXPORT_FOLDER_ID',DriveApp.getFolderById(c.ROOT_DRIVE_FOLDER_ID).createFolder('Exportaciones').getId());
    setupSpreadsheet_();
    if(!c.GOOGLE_FORM_ID)p.setProperty('GOOGLE_FORM_ID',createForm_(false).getId());
    if(!c.CORRECTION_FORM_ID)p.setProperty('CORRECTION_FORM_ID',createForm_(true).getId());
    c=config_();
    [['GOOGLE_FORM_ID',false],['CORRECTION_FORM_ID',true]].forEach(function(pair){
      var form=FormApp.openById(c[pair[0]]);linkResponseDestination_(form,c.SPREADSHEET_ID);
      mapQuestions_(form,pair[1]);
    });
    audit_(UMA.owner,'INITIALIZED','','Recursos creados o conservados');
    var result={spreadsheet:book_().getUrl(),form:FormApp.openById(c.GOOGLE_FORM_ID).getEditUrl(),correctionForm:FormApp.openById(c.CORRECTION_FORM_ID).getEditUrl(),folder:DriveApp.getFolderById(c.ROOT_DRIVE_FOLDER_ID).getUrl()};
    console.log(JSON.stringify(result));return result;
  });
}
function setupSpreadsheet_() {
  var ss=book_();ss.setSpreadsheetTimeZone('America/Lima');
  Object.keys(UMA.schema).forEach(function(name){
    var s=ss.getSheetByName(name)||ss.insertSheet(name),h=UMA.schema[name];
    if(s.getMaxColumns()<h.length)s.insertColumnsAfter(s.getMaxColumns(),h.length-s.getMaxColumns());
    var layoutNeeded=s.getLastRow()===0;
    if(layoutNeeded)s.getRange(1,1,1,h.length).setValues([h]);
    else {
      var existing=s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
      assert_(existing.every(function(value,index){return value&&existing.indexOf(value)===index;}),'Encabezados vacíos o duplicados: '+name);
      var missing=h.filter(function(k){return existing.indexOf(k)<0;});
      if(missing.length){layoutNeeded=true;var needed=existing.length+missing.length;if(s.getMaxColumns()<needed)s.insertColumnsAfter(s.getMaxColumns(),needed-s.getMaxColumns());s.getRange(1,existing.length+1,1,missing.length).setValues([missing]);}
    }
    if(!layoutNeeded)return;
    s.setFrozenRows(1);s.getRange(1,1,1,s.getLastColumn()).setBackground('#692572').setFontColor('#ffffff').setFontWeight('bold');
    s.setColumnWidths(1,s.getLastColumn(),180);
    if(!s.getFilter())s.getRange(1,1,Math.max(s.getLastRow(),2),s.getLastColumn()).createFilter();
    if(!s.getProtections(SpreadsheetApp.ProtectionType.SHEET).length)s.protect().setDescription('UMA: editar mediante el sistema').setWarningOnly(true);
  });
  var s=table_('Solicitudes'),col=s.getRange(1,1,1,s.getLastColumn()).getValues()[0].indexOf('status')+1;
  s.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('APLICADA_SIGU').setBackground('#dcfce7').setRanges([s.getRange(2,col,s.getMaxRows()-1)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('OBSERVADA').setBackground('#fff1d7').setRanges([s.getRange(2,col,s.getMaxRows()-1)]).build()
  ]);
  ['ACADEMIC_PERIOD','EMAIL_NOTIFICATION_ENABLED','INSTITUTIONAL_EMAIL_DOMAINS'].forEach(function(k){put_('Configuracion',{key:k,value:config_()[k]});});
}
function linkResponseDestination_(form,spreadsheetId){
  var destination='';
  try{destination=form.getDestinationId();}catch(error){assert_(/no response destination/i.test(error.message),error.message);}
  if(destination)assert_(destination===spreadsheetId,'El formulario ya tiene otro destino de respuestas. Revíselo antes de cambiarlo.');
  else form.setDestination(FormApp.DestinationType.SPREADSHEET,spreadsheetId);
}
function createForm_(correction) {
  var f=FormApp.create(correction?'SUBSANACIÓN DE DESCUENTO CORPORATIVO — UMA':'SOLICITUD DE DESCUENTO CORPORATIVO — UMA');
  f.setAcceptingResponses(false).setAllowResponseEdits(false).setLimitOneResponsePerUser(false);
  f.setDescription(correction?'Use únicamente el enlace seguro recibido por correo. Sus archivos se incorporarán al mismo expediente.':'Complete sus datos y adjunte la ficha socioeconómica llenada MANUALMENTE y firmada. Las cargas de archivos requieren iniciar sesión en Google.');
  f.setConfirmationMessage('Se recibió su envío. Tesorería validará los datos y documentos. La recepción no implica aprobación.');
  function text(k,required,email){var t=f.addTextItem().setTitle(UMA.labels[k]).setRequired(required);if(email)t.setValidation(FormApp.createTextValidation().requireTextIsEmail().build());return t;}
  if(correction){text('applicationId',true);text('token',true);text('institutionalEmail',true,true);text('identityNumber',true);f.addParagraphTextItem().setTitle(UMA.labels.clarification);}
  else {
    f.addSectionHeaderItem().setTitle('Datos del estudiante');text('institutionalEmail',true,true);text('personalEmail',false,true);
    f.addListItem().setTitle(UMA.labels.identityType).setChoiceValues(['DNI','CE','Pasaporte']).setRequired(true);
    text('identityNumber',true);text('name',true);
    f.addListItem().setTitle(UMA.labels.school).setChoiceValues(UMA.schools).setRequired(true);
    f.addSectionHeaderItem().setTitle('Convenio corporativo');
    var choice=f.addMultipleChoiceItem().setTitle(UMA.labels.discount).setRequired(true);
    var other=f.addPageBreakItem().setTitle('Otro convenio');text('otherDiscount',true);
    var documents=f.addPageBreakItem().setTitle('Documentación');
    choice.setChoices(UMA.discounts.map(function(d){return choice.createChoice(d,d==='Otro'?other:documents);}));
  }
  f.addSectionHeaderItem().setTitle('Ficha Socioeconómica 2027-I').setHelpText('Descargue el PDF original, llénelo MANUALMENTE, fírmelo y adjunte un escaneo o fotografía legible en PDF/JPG/PNG. El enlace de descarga se configura antes de publicar.');
  f.addCheckboxItem().setTitle(UMA.labels.signed).setChoiceValues(['Confirmo que la ficha está completa y firmada']).setRequired(true);
  f.addCheckboxItem().setTitle(UMA.labels.consent).setHelpText(privacyNotice_()).setChoiceValues(['He leído el aviso de privacidad de UMA']).setRequired(true);
  return f;
}
function mapQuestions_(form, correction) {
  var map={};Object.keys(UMA.labels).forEach(function(k){var items=form.getItems().filter(function(i){return i.getTitle()===UMA.labels[k];});assert_(items.length<=1,'Pregunta duplicada: '+UMA.labels[k]);if(items.length)map[k]=String(items[0].getId());});
  properties_().setProperty(correction?'CORRECTION_QUESTION_MAP':'QUESTION_MAP',JSON.stringify(map));return map;
}
/** Run after adding native file-upload questions and configuring original PDF. */
function finalizeSetup() {
  owner_();var c=config_();assert_(c.TEMPLATE_PDF_FILE_ID,'Configure TEMPLATE_PDF_FILE_ID con el PDF original');
  var pdf=DriveApp.getFileById(c.TEMPLATE_PDF_FILE_ID);assert_(pdf.getMimeType()==='application/pdf','La ficha original debe ser PDF');
  ['GOOGLE_FORM_ID','CORRECTION_FORM_ID'].forEach(function(k){
    var f=FormApp.openById(c[k]),map=mapQuestions_(f,k==='CORRECTION_FORM_ID');
    if(map.consent)f.getItemById(Number(map.consent)).asCheckboxItem().setHelpText(privacyNotice_());
    var download=c.TEMPLATE_PDF_URL||'https://drive.google.com/uc?export=download&id='+encodeURIComponent(pdf.getId());
    f.getItems(FormApp.ItemType.SECTION_HEADER).forEach(function(i){if(i.getTitle()==='Ficha Socioeconómica 2027-I')i.asSectionHeaderItem().setHelpText('DESCARGAR FICHA SOCIOECONÓMICA 2027-I: '+download+'\nLlénela MANUALMENTE, firme y cargue el PDF/JPG/PNG. Desde el celular use fotografías claras de todas las páginas.');});
  });
  var health=health_();assert_(health.ready,health.issues.join('\n'));installTriggers();console.log(JSON.stringify(health));return health;
}
function health_() {
  var c=config_(),issues=[],forms=[];
  ['SPREADSHEET_ID','ROOT_DRIVE_FOLDER_ID','EXPORT_FOLDER_ID','GOOGLE_FORM_ID','CORRECTION_FORM_ID','TEMPLATE_PDF_FILE_ID','CORRECTION_SECRET'].forEach(function(k){if(!c[k])issues.push('Falta '+k);});
  ['GOOGLE_FORM_ID','CORRECTION_FORM_ID'].forEach(function(k){if(!c[k])return;try{
    var f=FormApp.openById(c[k]),m=JSON.parse(c[k==='GOOGLE_FORM_ID'?'QUESTION_MAP':'CORRECTION_QUESTION_MAP']||'{}');
    var required=k==='GOOGLE_FORM_ID'?['institutionalEmail','personalEmail','identityType','identityNumber','name','school','discount','otherDiscount','signed','consent']:['applicationId','token','institutionalEmail','identityNumber','signed','consent'];
    required.forEach(function(field){if(!m[field]||!f.getItemById(Number(m[field])))issues.push(k+': falta pregunta '+UMA.labels[field]);});
    ['socioeconomic','supporting'].forEach(function(field){var item=m[field]&&f.getItemById(Number(m[field]));if(!item||String(item.getType())!=='FILE_UPLOAD')issues.push(k+': falta carga de archivos '+UMA.labels[field]);});
    forms.push({type:k,url:f.getPublishedUrl(),editUrl:f.getEditUrl(),accepting:f.isAcceptingResponses()});
  }catch(e){issues.push(k+': '+e.message);}});
  try{['ROOT_DRIVE_FOLDER_ID','EXPORT_FOLDER_ID'].forEach(function(k){if(c[k])assert_(DriveApp.getFolderById(c[k]).getSharingAccess()===DriveApp.Access.PRIVATE,'Carpeta '+k+' debe estar restringida');});}catch(e){issues.push(e.message);}
  return {ready:issues.length===0,issues:issues,forms:forms,owner:UMA.owner,emailEnabled:c.EMAIL_NOTIFICATION_ENABLED==='true',triggers:ScriptApp.getProjectTriggers().map(function(t){return {handler:t.getHandlerFunction(),id:t.getUniqueId()};}),quota:MailApp.getRemainingDailyQuota(),spreadsheet:c.SPREADSHEET_ID?'https://docs.google.com/spreadsheets/d/'+c.SPREADSHEET_ID+'/edit':''};
}
function runSystemHealthCheck(){reviewer_(true);return health_();}
function installTriggers() {
  owner_();var c=config_(),existing=ScriptApp.getProjectTriggers();
  [['onApplicationSubmit',c.GOOGLE_FORM_ID],['onCorrectionSubmit',c.CORRECTION_FORM_ID]].forEach(function(pair){
    var t=existing.find(function(t){return t.getHandlerFunction()===pair[0]&&t.getTriggerSourceId()===pair[1];});
    if(!t)t=ScriptApp.newTrigger(pair[0]).forForm(FormApp.openById(pair[1])).onFormSubmit().create();
    properties_().setProperty('TRIGGER_'+pair[0],t.getUniqueId());
  });
  [['processEmailQueue',1],['reconcileSubmissions',10]].forEach(function(pair){var t=existing.find(function(t){return t.getHandlerFunction()===pair[0];});if(!t)t=ScriptApp.newTrigger(pair[0]).timeBased().everyMinutes(pair[1]).create();properties_().setProperty('TRIGGER_'+pair[0],t.getUniqueId());});
  audit_(UMA.owner,'TRIGGERS_INSTALLED','','Disparadores del propietario');
}
function publishForms() {owner_();var h=health_();assert_(h.ready,h.issues.join('\n'));['GOOGLE_FORM_ID','CORRECTION_FORM_ID'].forEach(function(k){var f=FormApp.openById(config_()[k]);if(f.supportsAdvancedResponderPermissions())f.setPublished(true);f.setAcceptingResponses(true);});return health_();}

function configureWorkspace(input){
  owner_();assert_(input&&allowedOriginInput_(input.origin),'Indique el origen HTTPS exacto del sitio Render');
  return locked_(function(){
    var p=properties_(),c=config_();assert_(c.ROOT_DRIVE_FOLDER_ID,'Inicialice los recursos primero');
    p.setProperty('FRONTEND_ORIGINS',input.origin);p.setProperty('TEMPLATE_PDF_URL',input.origin+'/ficha-socioeconomica-2027-I.pdf');
    if(input.template||!c.TEMPLATE_PDF_FILE_ID){
      var bytes;
      if(input.template){assert_(typeof input.template.data==='string'&&input.template.data.length<7*1024*1024,'Archivo demasiado grande');bytes=Utilities.base64Decode(input.template.data);}
      else {var response=UrlFetchApp.fetch(input.origin+'/ficha-socioeconomica-2027-I.pdf',{muteHttpExceptions:true});assert_(response.getResponseCode()===200,'No se pudo importar el PDF original publicado en Render');bytes=response.getBlob().getBytes();}
      assert_(bytes.length>=5&&bytes.length<=5*1024*1024&&String.fromCharCode.apply(null,bytes.slice(0,5))==='%PDF-','El archivo no es un PDF válido de hasta 5 MB');
      var folder=restrictedFolder_(DriveApp.getFolderById(c.ROOT_DRIVE_FOLDER_ID),'Plantilla_original');
      var file=folder.createFile(Utilities.newBlob(bytes,'application/pdf','Ficha_Socioeconomica_2027-I_original.pdf'));
      file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);p.setProperty('TEMPLATE_PDF_FILE_ID',file.getId());
    }
    audit_(UMA.owner,'WORKSPACE_CONFIGURED','','Origen de Render y ficha original');
    c=config_();return {origin:input.origin,templateFileId:c.TEMPLATE_PDF_FILE_ID||'',templateDownload:c.TEMPLATE_PDF_URL,applicationFormUrl:FormApp.openById(c.GOOGLE_FORM_ID).getPublishedUrl(),correctionFormEditUrl:FormApp.openById(c.CORRECTION_FORM_ID).getEditUrl(),applicationFormEditUrl:FormApp.openById(c.GOOGLE_FORM_ID).getEditUrl(),next:'Añada las preguntas nativas de carga en ambos formularios y ejecute finalizeSetup.'};
  });
}
function allowedOriginInput_(origin){return typeof origin==='string'&&/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d+)?$/i.test(origin);}
function privacyNotice_(){return config_().PRIVACY_NOTICE||'Sus datos y documentos serán revisados por el Área de Tesorería de la Universidad María Auxiliadora para gestionar esta solicitud de descuento corporativo. Los documentos se mantienen con acceso restringido al personal autorizado. Consulte a UMA sobre el tratamiento, conservación de sus datos y ejercicio de sus derechos.';}
