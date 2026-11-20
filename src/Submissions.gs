function readResponse_(response, correction) {
  var map=JSON.parse(config_()[correction?'CORRECTION_QUESTION_MAP':'QUESTION_MAP']||'{}'),byId={};
  response.getItemResponses().forEach(function(ir){byId[String(ir.getItem().getId())]=ir.getResponse();});
  var values={};Object.keys(map).forEach(function(k){values[k]=byId[map[k]]||'';});
  function files(k){var v=values[k];return (Array.isArray(v)?v:v?[v]:[]).map(String);}
  return {values:values,uploads:{socioeconomic:files('socioeconomic'),supporting:files('supporting')}};
}
function validateTrigger_(e, handler, formKey) {
  owner_(e,handler);assert_(e&&e.response&&e.source&&String(e.source.getId())===config_()[formKey]&&String(e.triggerUid)===properties_().getProperty('TRIGGER_'+handler),'Evento de formulario no autorizado');
}
function onApplicationSubmit(e){validateTrigger_(e,'onApplicationSubmit','GOOGLE_FORM_ID');return ingest_(e.response,false);}
function onCorrectionSubmit(e){validateTrigger_(e,'onCorrectionSubmit','CORRECTION_FORM_ID');return ingest_(e.response,true);}
/**
 * Records one Google Forms response. Initial-form responses are grouped by institutional email:
 * the first creates the application, later ones become new revisions of the same application.
 * Data problems never discard a response; they are stored as `issues` for Treasury to see.
 */
function ingest_(response,correction) {
  effectiveOwner_();return locked_(function(){
    var cfg=config_(),formId=cfg[correction?'CORRECTION_FORM_ID':'GOOGLE_FORM_ID'],key=formId+':'+response.getId();
    var event=find_('Eventos','key',key);if(event&&event.status==='DONE')return event.applicationId;
    event=event||{key:key,formId:formId,responseId:response.getId(),timestamp:now_(),status:'PROCESSING'};
    event.attempts=Number(event.attempts||0)+1;event.attemptedAt=now_();
    try{
      var data=readResponse_(response,correction),a,issues=[],info=null,submittedAt=response.getTimestamp().toISOString();
      if(correction){
        if(event.applicationId)a=application_(event.applicationId);
        else{
          // The old correction form is no longer sent. A response that does not pass its code check is grouped
          // by institutional email, the same rule as the main form, instead of failing forever.
          try{a=application_(cleanText_(data.values.applicationId));validateCorrection_(a,data.values,cfg);}
          catch(codeError){
            a=studentApplication_({institutionalEmail:data.values.institutionalEmail,personalEmail:'',identityType:'',identityNumber:data.values.identityNumber},cfg.ACADEMIC_PERIOD);
            if(!a){
              // Nothing to attach it to: close the event so it is not retried, but keep a trace in Errores.
              event.status='DONE';event.error='DISCARDED: '+codeError.message;event.retryAt='';put_('Eventos',event);
              error_('CORRECTION_DISCARDED',key,new Error('Formulario de corrección sin solicitud asociada ('+codeError.message+')'));return '';
            }
            issues.push('Enviado con el formulario de corrección anterior; se asoció por correo institucional');
          }
          assert_(!rows_('Eventos').some(function(prior){return prior.applicationId===a.id&&prior.formId===formId&&prior.status!=='DONE';}),'Existe una subsanación en proceso. Tesorería debe resolver ese envío primero.');
          event.applicationId=a.id;event.revision=nextRevision_(a);put_('Eventos',event);
        }
      }else{
        info=inspectApplication_(data.values,cfg);issues=info.issues.slice();
        if(event.applicationId)a=application_(event.applicationId);
        else{
          a=find_('Solicitudes','initialResponseId',response.getId());
          if(a)event.revision=1;
          else{
            a=studentApplication_(info.data,cfg.ACADEMIC_PERIOD);
            if(a)event.revision=nextRevision_(a);
            else{
              a=Object.assign({},info.data,{id:nextId_(),createdAt:submittedAt,updatedAt:now_(),period:cfg.ACADEMIC_PERIOD,initialResponseId:response.getId(),revision:1,version:1,status:'RECIBIDA',emailStatus:'',submissions:1,lastSubmissionAt:submittedAt,issues:issueText_(1,issues)});
              saveApplication_(a);event.revision=1;
            }
          }
          event.applicationId=a.id;put_('Eventos',event);
        }
      }
      var revision=Number(event.revision);
      if(!(data.values.signed&&data.values.consent))issues.push('Falta confirmación de firma o privacidad');
      issues=issues.concat(copyDocuments_(a,data.uploads,revision,submittedAt));
      var committed=Number(a.revision)>=revision;
      if(correction){
        if(!committed){a.revision=revision;a.version=Number(a.version)+1;a.submissions=Number(a.submissions||1)+1;a.lastSubmissionAt=submittedAt;}
        a.lastCorrectionAt=a.lastCorrectionAt||now_();a.correctionExpiresAt='';a.issues=issueText_(revision,issues);
        // An approved discount is never reopened by a late correction; it only gets an alert.
        if(a.status==='APLICADA_SIGU'){a.issues=issueText_(revision,['Nuevo envío recibido después de aplicar el descuento en SIGU'].concat(issues));transition_(a,'APLICADA_SIGU',a.recipient,'Envío del formulario de corrección',key+':status');}
        else transition_(a,'CORRECCION_RECIBIDA',a.recipient,cleanText_(data.values.clarification),key+':status');
      }else if(revision===1){
        a.issues=issueText_(1,issues);
        if(!find_('Historial_Estados','key',key+':status'))transition_(a,'RECIBIDA',UMA.owner,'Recepción inicial',key+':status');
      }else if(!committed){
        var approved=a.status==='APLICADA_SIGU';
        if(approved)issues.unshift('Nuevo envío recibido después de aplicar el descuento en SIGU');
        else ['personalEmail','identityType','identityNumber','name','school','discount','otherDiscount'].forEach(function(k){a[k]=info.data[k];});
        if(!approved&&info.data.recipient)a.recipient=info.data.recipient;
        var next=approved?'APLICADA_SIGU':(a.status==='OBSERVADA'||a.status==='CORRECCION_RECIBIDA')?'CORRECCION_RECIBIDA':'RECIBIDA';
        if(a.status==='OBSERVADA'){a.correctionExpiresAt='';a.lastCorrectionAt=now_();}
        a.revision=revision;a.version=Number(a.version)+1;a.submissions=Number(a.submissions||1)+1;a.lastSubmissionAt=submittedAt;a.issues=issueText_(revision,issues);
        transition_(a,next,a.recipient||'Estudiante','Nuevo envío del formulario · revisión '+revision,key+':status');
      }
      a.processingError='';saveApplication_(a);
      if(cfg.RECEIPT_EMAIL_ENABLED==='true')queueReceiptEmail_(a,key,revision,issues);
      event.status='DONE';event.error='';event.retryAt='';put_('Eventos',event);syncStudentRowSafely_(a);audit_(UMA.owner,correction?'CORRECTION_RECEIVED':(revision>1?'RESUBMISSION_RECEIVED':'APPLICATION_RECEIVED'),a.id,'Revisión '+revision+(issues.length?' · '+issues.length+' alerta(s)':''));return a.id;
    }catch(e){
      event.status='ERROR';event.error=String(e.message);event.retryAt=new Date(Date.now()+Math.min(86400000,600000*Math.pow(2,Math.min(8,event.attempts-1)))).toISOString();put_('Eventos',event);
      if(event.applicationId){try{var failed=application_(event.applicationId);failed.processingError=e.message;saveApplication_(failed);}catch(_){}}
      error_('FORM_SUBMIT',key,e);throw e;
    }
  });
}
/** The student's application for the period, matched by institutional email. Prefers one still in progress. */
function studentApplication_(data,period){
  var key=studentKey_(data),matches=rows_('Solicitudes').filter(function(r){return r.period===period&&studentKey_(r)===key;});
  return matches.filter(function(r){return r.status!=='APLICADA_SIGU';}).sort(byNewest_)[0]||matches.sort(byNewest_)[0]||null;
}
function byNewest_(a,b){return String(b.createdAt).localeCompare(String(a.createdAt));}
/** Reserves a revision number that no other (possibly unfinished) submission of the application uses. */
function nextRevision_(a){
  var used=rows_('Eventos').filter(function(e){return e.applicationId===a.id;}).map(function(e){return Number(e.revision)||0;});
  return Math.max.apply(null,[Number(a.revision)||1].concat(used))+1;
}
function issueText_(revision,issues){return issues.length?issues.map(function(i){return 'Revisión '+revision+': '+i;}).join('\n'):'';}
function correctionToken_(a) {
  var message=[a.id,a.correctionRevision,a.correctionExpiresAt].join('|');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(message,config_().CORRECTION_SECRET)).replace(/=+$/,'');
}
function constantEqual_(a,b){a=String(a||'');b=String(b||'');var diff=a.length^b.length;for(var i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
function validateCorrection_(a,v,cfg) {
  assert_(a.status==='OBSERVADA','La solicitud no admite subsanación');
  assert_(Date.parse(a.correctionExpiresAt)>Date.now(),'El enlace de subsanación venció. Contacte a Tesorería.');
  assert_(constantEqual_(correctionToken_(a),v.token),'Código de subsanación inválido');
  assert_(normalizeEmail_(v.institutionalEmail)===a.institutionalEmail&&cleanText_(v.identityNumber)===String(a.identityNumber),'Los datos no corresponden al expediente');
}
function correctionUrl_(a) {
  var f=FormApp.openById(config_().CORRECTION_FORM_ID),map=JSON.parse(config_().CORRECTION_QUESTION_MAP),r=f.createResponse();
  // Keep identity numbers and email addresses out of URL history/referrers.
  [['applicationId',a.id],['token',correctionToken_(a)]].forEach(function(pair){r.withItemResponse(f.getItemById(Number(map[pair[0]])).asTextItem().createResponse(String(pair[1])));});
  return r.toPrefilledUrl();
}
/** Owner recovery job: no emails or reviews are inferred from edited cells. */
function reconcileSubmissions(e) {
  owner_(e,'reconcileSubmissions');var cfg=config_(),p=properties_();
  locked_(recoverDecisions_);
  if(p.getProperty('DATA_MODEL')!=='email-v2')locked_(migrateToEmailGrouping_);
  if(p.getProperty('STATUS_MODEL')!=='v2')locked_(migrateRetiredStatus_);
  // Whoever can open the spreadsheet can view the documents its links point to (Sharing.gs).
  try{syncDocumentAccess_(false);}catch(e){error_('DOCUMENT_ACCESS','',e);}
  if(p.getProperty('EVENTS_RETRY')!=='v3')locked_(function(){rows_('Eventos').filter(function(e){return e.status!=='DONE'&&!e.applicationId;}).forEach(function(e){e.retryAt='';put_('Eventos',e);});p.setProperty('EVENTS_RETRY','v3');});
  [false,true].forEach(function(correction){
    var key=correction?'CORRECTION_FORM_ID':'GOOGLE_FORM_ID',cursorKey='CURSOR_'+key;
    var since=Number(p.getProperty(cursorKey)||0),cutoff=Date.now();
    var responses=FormApp.openById(cfg[key]).getResponses(new Date(Math.max(0,since-60000)));
    // Bound work per execution; only advance after every response in this interval was considered.
    var known=rows_('Eventos'),processed=0;for(var i=0;i<responses.length;i++){
      var prior=known.find(function(event){return event.formId===cfg[key]&&event.responseId===responses[i].getId();});
      if(prior&&(prior.status==='DONE'||prior.status==='ERROR'))continue;
      if(processed>=40)return;
      try{ingest_(responses[i],correction);}catch(e){/* persisted error; retried separately below */}processed++;
    }
    p.setProperty(cursorKey,String(cutoff));
    rows_('Eventos').filter(function(e){return e.formId===cfg[key]&&e.status!=='DONE'&&(!e.retryAt||Date.parse(e.retryAt)<=Date.now());}).sort(function(a,b){return String(a.attemptedAt||'').localeCompare(String(b.attemptedAt||''));}).slice(0,10).forEach(function(e){try{ingest_(FormApp.openById(cfg[key]).getResponse(e.responseId),correction);}catch(_){}});
  });
}
/**
 * One-time upgrade: earlier versions grouped by identity number and dropped invalid or duplicate
 * submissions. Those responses are queued again so they join the student's application by email.
 */
function migrateToEmailGrouping_(){
  rows_('Eventos').forEach(function(e){
    if(e.error==='DUPLICATE_APPLICATION'){e.status='ERROR';e.applicationId='';e.revision='';e.retryAt='';e.error='Pendiente de reagrupar por correo institucional';put_('Eventos',e);}
    else if(e.status==='ERROR'&&!e.applicationId){e.retryAt='';put_('Eventos',e);}
  });
  var apps=rows_('Solicitudes'),groups={};
  apps.forEach(function(a){var k=a.period+'|'+studentKey_(a);(groups[k]=groups[k]||[]).push(a.id);});
  apps.forEach(function(a){
    var changed=false,others=groups[a.period+'|'+studentKey_(a)].filter(function(id){return id!==a.id;});
    if(!a.submissions){a.submissions=1;a.lastSubmissionAt=a.lastSubmissionAt||a.createdAt;changed=true;}
    // Applications created separately by the identity-based version are flagged, not merged: they may hold decisions.
    if(others.length&&String(a.issues).indexOf('mismo correo institucional')<0){a.issues=(a.issues?a.issues+'\n':'')+'Existe otra solicitud con el mismo correo institucional: '+others.join(', ');changed=true;}
    if(changed)put_('Solicitudes',a,'id');
  });
  properties_().setProperty('DATA_MODEL','email-v2');audit_(UMA.owner,'DATA_MODEL_UPGRADED','','Envíos agrupados por correo institucional');
}
/** Owner action from the Apps Script editor: regroup now instead of waiting for the 10-minute trigger. */
function regroupSubmissionsByEmail(){
  owner_();locked_(migrateToEmailGrouping_);
  var cfg=config_();[false,true].forEach(function(correction){var formId=cfg[correction?'CORRECTION_FORM_ID':'GOOGLE_FORM_ID'];
    rows_('Eventos').filter(function(e){return e.formId===formId&&e.status!=='DONE';}).sort(function(a,b){return String(a.timestamp).localeCompare(String(b.timestamp));}).slice(0,30).forEach(function(e){try{ingest_(FormApp.openById(formId).getResponse(e.responseId),correction);}catch(_){}});
  });
  return rows_('Eventos').filter(function(e){return e.status!=='DONE';}).map(function(e){return {key:e.key,error:e.error};});
}
/** One-time upgrade: the "Validada, pendiente SIGU" status was removed; those cases go back to En revisión. */
function migrateRetiredStatus_(){
  rows_('Solicitudes').filter(function(a){return a.status==='VALIDADA_PENDIENTE_SIGU';}).forEach(function(a){
    transition_(a,'EN_REVISION',UMA.owner,'Estado "Validada, pendiente SIGU" retirado del sistema','RETIRED_STATUS:'+a.id);saveApplication_(a);
  });
  properties_().setProperty('STATUS_MODEL','v2');
}
function retryFailedEvent(key){
  owner_();var event=find_('Eventos','key',key);assert_(event&&event.status!=='DONE','No hay un evento pendiente');
  assert_([config_().GOOGLE_FORM_ID,config_().CORRECTION_FORM_ID].indexOf(event.formId)>=0,'Formulario no autorizado');
  audit_(UMA.owner,'EVENT_RETRY',event.applicationId,event.key);
  return ingest_(FormApp.openById(event.formId).getResponse(event.responseId),event.formId===config_().CORRECTION_FORM_ID);
}
