function saveDecision(input) {
  var actor=reviewer_();assert_(input&&/^[\w-]{12,100}$/.test(input.requestId),'Identificador de decisión inválido');
  return locked_(function(){
    var key='DECISION:'+input.requestId,journal=find_('Decisiones','key',key);
    if(journal){assert_(journal.applicationId===input.id&&journal.reviewer===actor,'Conflicto de decisión');applyDecision_(journal);return {id:input.id,status:application_(input.id).status,emailStatus:application_(input.id).emailStatus};}
    var a=application_(input.id);validateDecision_(a,input);
    assert_(!rows_('Eventos').some(function(event){return event.applicationId===a.id&&event.status!=='DONE';}),'Hay documentos pendientes de procesamiento. Espere la recuperación antes de revisar.');
    assert_(!rows_('Decisiones').some(function(d){return d.applicationId===a.id&&d.status!=='DONE';}),'Una decisión anterior está en recuperación. Actualice en unos minutos.');
    var payload={decision:input.decision,version:Number(a.version),siguConfirmed:input.siguConfirmed===true,siguReference:cleanText_(input.siguReference,200),category:cleanText_(input.category,150),observation:cleanText_(input.observation,3000),instructions:cleanText_(input.instructions,3000),expiresAt:new Date(Date.now()+Number(config_().CORRECTION_DAYS)*86400000).toISOString()};
    journal={key:key,applicationId:a.id,reviewer:actor,payload:JSON.stringify(payload),status:'PENDING',timestamp:now_()};
    put_('Decisiones',journal);applyDecision_(journal);return {id:a.id,status:application_(a.id).status,emailStatus:'PENDING'};
  });
}
function applyDecision_(j) {
  if(j.status==='DONE')return;
  var a=application_(j.applicationId),d=JSON.parse(j.payload);
  if(a.lastDecisionKey===j.key){j.status='DONE';put_('Decisiones',j);return;}
  assert_(Number(a.version)===d.version,'Versión incompatible durante recuperación');
  var old=a.status;a.reviewer=j.reviewer;a.reviewedAt=j.timestamp;a.version=d.version+1;
  a.lastDecisionKey=j.key;a.emailStatus='PENDING';
  if(d.decision==='APPROVED'){
    assert_(d.siguConfirmed===true,'Confirmación SIGU requerida');a.siguConfirmedAt=j.timestamp;a.siguReference=d.siguReference;
    a.correctionExpiresAt='';transition_(a,'APLICADA_SIGU',j.reviewer,'Registro en SIGU confirmado manualmente',j.key+':status');
  }else{
    a.category=d.category;a.observation=d.observation;a.instructions=d.instructions;
    a.correctionExpiresAt=d.expiresAt;a.correctionRevision=Number(a.version);
    if(!find_('Observaciones','key',j.key))append_('Observaciones',{key:j.key,applicationId:a.id,revision:a.revision,category:a.category,observation:a.observation,instructions:a.instructions,reviewer:j.reviewer,timestamp:j.timestamp});
    transition_(a,'OBSERVADA',j.reviewer,a.category,j.key+':status');
  }
  queueDecisionEmail_(a,d.decision,j.key);
  // Queue dispatch checks lastDecisionKey; a half-written decision cannot send email.
  saveApplication_(a);j.status='DONE';j.error='';put_('Decisiones',j);
  audit_(j.reviewer,'REVIEW_'+d.decision,a.id,old+' → '+a.status);
}
function recoverDecisions_(){rows_('Decisiones').filter(function(j){return j.status!=='DONE';}).slice(0,20).forEach(function(j){try{applyDecision_(j);}catch(e){j.error=e.message;put_('Decisiones',j);error_('DECISION_RECOVERY',j.key,e);}});}
function setReviewStatus(id,version,status) {
  var actor=reviewer_();assert_(['EN_REVISION','VALIDADA_PENDIENTE_SIGU'].indexOf(status)>=0,'Estado inválido');
  return locked_(function(){var a=application_(id);assert_(Number(a.version)===Number(version),'Actualice el expediente');assert_(['RECIBIDA','EN_REVISION','CORRECCION_RECIBIDA','VALIDADA_PENDIENTE_SIGU'].indexOf(a.status)>=0,'Transición no permitida');
    assert_(!a.processingError&&!rows_('Eventos').some(function(event){return event.applicationId===id&&event.status!=='DONE';}),'Espere el procesamiento de los documentos');
    assert_(!rows_('Decisiones').some(function(j){return j.applicationId===id&&j.status!=='DONE';}),'Decisión pendiente de recuperación');
    transition_(a,status,actor);a.reviewer=actor;a.version=Number(a.version)+1;saveApplication_(a);audit_(actor,'STATUS_CHANGED',id,status);return a;});
}
function renewCorrection(id) {
  var actor=reviewer_();return locked_(function(){var a=application_(id);assert_(a.status==='OBSERVADA','Solo para solicitudes observadas');
    assert_(!rows_('Decisiones').some(function(j){return j.applicationId===id&&j.status!=='DONE';}),'Espere la recuperación de la decisión anterior');
    a.version=Number(a.version)+1;a.correctionRevision=a.version;a.correctionExpiresAt=new Date(Date.now()+Number(config_().CORRECTION_DAYS)*86400000).toISOString();
    var key='RENEW:'+Utilities.getUuid();queueDecisionEmail_(a,'OBSERVED',key);a.lastDecisionKey=key;a.emailStatus='PENDING';saveApplication_(a);audit_(actor,'CORRECTION_RENEWED',id,'Nuevo enlace por correo');return {status:'PENDING'};});
}
