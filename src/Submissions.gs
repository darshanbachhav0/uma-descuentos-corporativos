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
function ingest_(response,correction) {
  effectiveOwner_();return locked_(function(){
    var cfg=config_(),formId=cfg[correction?'CORRECTION_FORM_ID':'GOOGLE_FORM_ID'],key=formId+':'+response.getId();
    var event=find_('Eventos','key',key);if(event&&event.status==='DONE')return event.applicationId;
    event=event||{key:key,formId:formId,responseId:response.getId(),timestamp:now_(),status:'PROCESSING'};
    try{
      var data=readResponse_(response,correction),a;
      if(correction){
        a=application_(cleanText_(data.values.applicationId));
        if(!event.applicationId){
          validateCorrection_(a,data.values,cfg);
          assert_(!rows_('Eventos').some(function(prior){return prior.applicationId===a.id&&prior.formId===formId&&prior.status!=='DONE';}),'Existe una subsanación en proceso. Tesorería debe resolver ese envío primero.');
          event.applicationId=a.id;event.revision=Number(a.revision)+1;put_('Eventos',event);
        }
      }else{
        var valid=validateApplication_(data.values,cfg);
        if(event.applicationId)a=application_(event.applicationId);
        else{
          a=find_('Solicitudes','initialResponseId',response.getId());
          if(a){event.applicationId=a.id;event.revision=1;put_('Eventos',event);}
          else a=rows_('Solicitudes').find(function(r){return r.period===cfg.ACADEMIC_PERIOD&&r.identityType===valid.identityType&&r.identityNumber===valid.identityNumber;});
          if(a&&a.initialResponseId!==response.getId()){event.applicationId=a.id;event.revision=a.revision;event.status='DONE';event.error='DUPLICATE_APPLICATION';put_('Eventos',event);audit_(UMA.owner,'DUPLICATE_SUBMISSION',a.id,'Envío '+response.getId()+' conservado en respuestas originales; use subsanación');return a.id;}
          if(!a){
          a=Object.assign(valid,{id:nextId_(),createdAt:response.getTimestamp().toISOString(),updatedAt:now_(),period:cfg.ACADEMIC_PERIOD,initialResponseId:response.getId(),revision:1,version:1,status:'RECIBIDA',emailStatus:''});
          saveApplication_(a);event.applicationId=a.id;event.revision=1;put_('Eventos',event);
          }
        }
      }
      // A saved incomplete event resumes the same application/revision.
      assert_(data.values.signed&&data.values.consent,'Falta confirmación de firma o privacidad');
      copyDocuments_(a,data.uploads,Number(event.revision));
      if(correction){
        var alreadyCommitted=Number(a.revision)===Number(event.revision);
        a.revision=Number(event.revision);if(!alreadyCommitted)a.version=Number(a.version)+1;a.lastCorrectionAt=a.lastCorrectionAt||now_();a.correctionExpiresAt='';
        transition_(a,'CORRECCION_RECIBIDA',a.recipient,cleanText_(data.values.clarification),key+':status');
      }else if(!find_('Historial_Estados','key',key+':status'))transition_(a,'RECIBIDA',UMA.owner,'Recepción inicial',key+':status');
      a.processingError='';saveApplication_(a);event.status='DONE';event.error='';put_('Eventos',event);audit_(UMA.owner,correction?'CORRECTION_RECEIVED':'APPLICATION_RECEIVED',a.id,'Revisión '+a.revision);return a.id;
    }catch(e){
      event.status='ERROR';event.error=String(e.message);put_('Eventos',event);
      if(event.applicationId){try{var failed=application_(event.applicationId);failed.processingError=e.message;saveApplication_(failed);}catch(_){}}
      error_('FORM_SUBMIT',key,e);throw e;
    }
  });
}
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
  [false,true].forEach(function(correction){
    var key=correction?'CORRECTION_FORM_ID':'GOOGLE_FORM_ID',cursorKey='CURSOR_'+key;
    var since=Number(p.getProperty(cursorKey)||0),cutoff=Date.now();
    var responses=FormApp.openById(cfg[key]).getResponses(new Date(Math.max(0,since-60000)));
    // Bound work per execution; only advance after every response in this interval was considered.
    var processed=0;for(var i=0;i<responses.length;i++){
      if(processed>=40)return;
      try{ingest_(responses[i],correction);}catch(e){/* persisted error; retried separately below */}processed++;
    }
    p.setProperty(cursorKey,String(cutoff));
    rows_('Eventos').filter(function(e){return e.formId===cfg[key]&&e.status!=='DONE';}).slice(0,5).forEach(function(e){try{ingest_(FormApp.openById(cfg[key]).getResponse(e.responseId),correction);}catch(_){}});
  });
}
