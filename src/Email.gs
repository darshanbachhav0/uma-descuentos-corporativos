function approvedEmail_(a) {
  return {subject:'Corporate discount application confirmation',body:'Dear student '+a.name+',\n\nWe inform you that your corporate discount has already been entered into SIGU.\n\nTo maintain the discount benefit, you must pay up to one day before the installment due date according to the payment schedule.\n\nSIGU: https://sigu.uma.edu.pe/alumno/entrar\n\nPayments can be made through SIGU, Yape, or debit/credit card. For BBVA channels, BCP app, Interbank, or Yape, the discount will be reflected within approximately 30 minutes.\n\nAtentamente,\nÁrea de Tesorería\nUniversidad María Auxiliadora'};
}
function observedEmail_(a,link) {
  return {subject:'Observaciones a su solicitud de descuento corporativo — UMA',body:'Estimado/a '+a.name+':\n\nHemos revisado su solicitud '+a.id+' de descuento corporativo ('+a.discount+').\n\nObservación: '+a.category+'\n'+a.observation+'\n\nInstrucciones para subsanar:\n'+a.instructions+'\n\nPresente sus documentos corregidos en el siguiente enlace seguro:\n'+link+'\n\nEl enlace vence el '+a.correctionExpiresAt.slice(0,10)+'. Es personal; no lo comparta. Su subsanación se incorporará al mismo expediente y se revisará nuevamente.\n\nAtentamente,\nÁrea de Tesorería\nUniversidad María Auxiliadora'};
}
function queueDecisionEmail_(a,type,decisionKey) {
  var key=decisionKey+':EMAIL';if(find_('Correos','key',key))return;
  assert_(validEmail_(a.recipient),'Destinatario inválido');
  assert_([a.institutionalEmail,a.personalEmail].indexOf(a.recipient)>=0,'El destinatario debe proceder del formulario');
  var message=type==='APPROVED'?approvedEmail_(a):observedEmail_(a,correctionUrl_(a));
  append_('Correos',{key:key,applicationId:a.id,decisionKey:decisionKey,type:type,recipient:a.recipient,subject:message.subject,body:message.body,status:'PENDING',attempts:0,createdAt:now_()});
}
function mailHtml_(body) {
  var escaped=escapeHtml_(body).replace(/https:\/\/[^\s<]+/g,function(url){return '<a style="color:#692572" href="'+url+'">'+url+'</a>';}).replace(/\n/g,'<br>');
  return '<div style="font:16px Arial,sans-serif;color:#252735;max-width:640px;margin:auto"><div style="background:#692572;color:white;padding:24px;font-size:24px;font-weight:bold">UMA <span style="font-size:14px">Universidad María Auxiliadora</span></div><div style="padding:28px;border:1px solid #e6e2ea">'+escaped+'</div><p style="font-size:12px;color:#666">Área de Tesorería · Notificación de solicitud de descuento corporativo</p></div>';
}
/** Install this time-driven trigger while signed in as UMA.owner. */
function processEmailQueue(e) {
  owner_(e,'processEmailQueue');return locked_(function(){
    recoverDecisions_();var cfg=config_();
    var logs=rows_('Correos');
    logs.filter(function(m){return m.status==='SENDING';}).forEach(function(m){m.status='UNCERTAIN';m.error='Ejecución interrumpida. Verifique el envío antes de resolver.';put_('Correos',m);var a=application_(m.applicationId);if(a.lastDecisionKey===m.decisionKey){a.emailStatus='UNCERTAIN';saveApplication_(a);}});
    if(cfg.EMAIL_NOTIFICATION_ENABLED!=='true')return {paused:true};
    var sent=0,quota=MailApp.getRemainingDailyQuota();
    logs.filter(function(m){return m.status==='PENDING';}).slice(0,15).forEach(function(m){
      if(quota<=0)return;
      var a=application_(m.applicationId);
      if(a.lastDecisionKey!==m.decisionKey){
        // Do not send an obsolete correction request or uncommitted decision.
        var j=find_('Decisiones','key',m.decisionKey);if(j&&j.status!=='DONE')return;
        m.status='CANCELLED';m.error='Notificación reemplazada por una decisión posterior';put_('Correos',m);return;
      }
      assert_(validEmail_(m.recipient)&&[a.institutionalEmail,a.personalEmail].indexOf(m.recipient)>=0,'Destinatario de cola inválido');
      m.status='SENDING';m.attempts=Number(m.attempts)+1;m.attemptedAt=now_();put_('Correos',m);SpreadsheetApp.flush();
      try{
        MailApp.sendEmail({to:m.recipient,subject:m.subject,body:m.body,htmlBody:mailHtml_(m.body),name:'Tesorería UMA',replyTo:UMA.owner});
        m.status='SENT';m.sentAt=now_();m.error='';quota--;sent++;
      }catch(e){
        // MailApp has no idempotency key or delivery receipt: an exception may follow acceptance.
        m.status='UNCERTAIN';m.error=String(e.message).slice(0,1500);error_('SEND_EMAIL',m.key,e);
      }
      put_('Correos',m);a.emailStatus=m.status;saveApplication_(a);audit_(UMA.owner,'EMAIL_'+m.status,a.id,m.key);
    });
    return {sent:sent,remainingQuota:quota};
  });
}
/** Only the owner may resolve an uncertain send after checking the recipient/mail records. */
function resolveEmail(key,resolution,note) {
  var actor=reviewer_(true);assert_(['CONFIRM_SENT','REQUEUE'].indexOf(resolution)>=0,'Resolución inválida');assert_(cleanText_(note).length>=10,'Documente la comprobación realizada');
  return locked_(function(){var m=find_('Correos','key',key);assert_(m&&m.status==='UNCERTAIN','Solo se resuelven envíos inciertos');
    var a=application_(m.applicationId);assert_(a.lastDecisionKey===m.decisionKey,'El mensaje quedó obsoleto');
    if(resolution==='CONFIRM_SENT'){m.status='SENT';m.sentAt=now_();}else m.status='PENDING';
    m.error=cleanText_(note,2000);put_('Correos',m);a.emailStatus=m.status;saveApplication_(a);audit_(actor,'EMAIL_'+resolution,a.id,note);return {status:m.status};});
}
