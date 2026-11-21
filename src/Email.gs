function approvedEmail_(a) {
  // Text approved by Tesorería UMA (Spanish). The sender name is "Tesorería UMA".
  return {subject:'Confirmación de aplicación de descuento corporativo',body:'Estimado(a) estudiante '+a.name+':\n\n'+
    'Le informamos que su descuento corporativo ya fue ingresado al SIGU.\n'+
    '📅 Para mantener el beneficio del descuento, tenga en cuenta que debe realizar el pago hasta un día antes de la fecha de vencimiento de la cuota, según el cronograma de pagos.\n'+
    'Puede ingresar a su plataforma SIGU a través del siguiente enlace: https://sigu.uma.edu.pe/alumno/entrar\n'+
    '💳 Puede realizar sus pagos a través de la plataforma SIGU, mediante Yape o con tarjeta de débito o crédito.\n'+
    '🏦 Asimismo, si realiza el pago a través de los canales del BBVA (app, agentes o banca por internet), la app del BCP, Interbank o Yape, el descuento se verá reflejado en un plazo aproximado de 30 minutos.\n\n'+
    'Atentamente,\nTesorería UMA\nUniversidad María Auxiliadora'};
}
/** Asks the student to send the same application form again; the new submission joins this application by email. */
function observedEmail_(a,link) {
  return {subject:'Observaciones a su solicitud de descuento corporativo — UMA',body:'Estimado/a '+a.name+':\n\nHemos revisado su solicitud '+a.id+' de descuento corporativo ('+a.discount+').\n\nObservación: '+a.category+'\n'+a.observation+
    '\n\nPara corregirla, vuelva a llenar el formulario de solicitud y adjunte los documentos corregidos:\n'+link+
    '\n\nUse el mismo correo institucional ('+a.institutionalEmail+'). Así su nuevo envío se agregará automáticamente a esta misma solicitud y Tesorería lo revisará nuevamente.\n\nAtentamente,\nÁrea de Tesorería\nUniversidad María Auxiliadora'};
}
/** Visible context shared by plain text and HTML. No identity numbers or private file links. */
function deliveryBody_(body,a) {
  var date=a.createdAt?limaDate_(a.createdAt):'',marker='\n\n---\nReferencia de solicitud: '+a.id;
  var footer=marker+
    (/^\d{4}-\d{2}-\d{2}$/.test(date)?'\nFecha de presentación: '+date:'')+
    '\nRecibe esta notificación porque presentó una solicitud de descuento corporativo a UMA.'+
    '\nRemitente y contacto de Tesorería: '+UMA.owner+
    '\nPuede responder a este correo para consultar sobre su solicitud.';
  // A manually resolved UNCERTAIN send must not acquire repeated footers.
  body=String(body);return body.indexOf(marker)>=0?body:body+footer;
}
function queueDecisionEmail_(a,type,decisionKey) {
  var key=decisionKey+':EMAIL';if(find_('Correos','key',key))return;
  assert_(validEmail_(a.recipient),'Destinatario inválido');
  assert_([a.institutionalEmail,a.personalEmail].indexOf(a.recipient)>=0,'El destinatario debe proceder del formulario');
  var message=type==='APPROVED'?approvedEmail_(a):observedEmail_(a,studentFormUrl_(config_()));
  append_('Correos',{key:key,applicationId:a.id,decisionKey:decisionKey,type:type,recipient:a.recipient,subject:message.subject,body:deliveryBody_(message.body,a),status:'PENDING',attempts:0,createdAt:now_()});
  markMailQueue_();
}
/** Optional acknowledgement of each form submission, listing any problem the student can fix by resubmitting. */
function receiptEmail_(a,revision,issues){
  var visible=(issues||[]).filter(function(i){return !/después de aplicar/.test(i);});
  return {subject:'Recibimos su solicitud de descuento corporativo — UMA',body:'Estimado/a '+a.name+':\n\nRecibimos su envío (revisión '+revision+') de la solicitud '+a.id+' de descuento corporativo ('+a.discount+'). Tesorería revisará sus datos y documentos. La recepción no implica aprobación.'+
    (visible.length?'\n\nDetectamos lo siguiente en su envío:\n- '+visible.join('\n- ')+'\n\nPuede volver a enviar el formulario con el mismo correo institucional; el nuevo envío se añadirá a esta misma solicitud.':'')+
    '\n\nAtentamente,\nÁrea de Tesorería\nUniversidad María Auxiliadora'};
}
function queueReceiptEmail_(a,eventKey,revision,issues){
  var key=eventKey+':RECEIPT:EMAIL';if(find_('Correos','key',key)||!validEmail_(a.recipient))return;
  var message=receiptEmail_(a,revision,issues);
  append_('Correos',{key:key,applicationId:a.id,decisionKey:eventKey,type:'RECEIVED',recipient:a.recipient,subject:message.subject,body:deliveryBody_(message.body,a),status:'PENDING',attempts:0,createdAt:now_()});
  markMailQueue_();
}
/** A property flag lets the minute trigger stop before opening the spreadsheet when nothing is queued. */
function markMailQueue_(){properties_().setProperty('MAIL_QUEUE_STATE','active');}
function mailHtml_(body) {
  // Tokenize before escaping so query strings are escaped exactly once in both href and label.
  var html='',last=0,pattern=/https:\/\/[^\s<>"']+/g,match;
  body=String(body);
  while((match=pattern.exec(body))!==null){
    html+=escapeHtml_(body.slice(last,match.index));var url=escapeHtml_(match[0]);
    html+='<a style="color:#b51042" href="'+url+'">'+url+'</a>';last=pattern.lastIndex;
  }
  html+=escapeHtml_(body.slice(last));
  return '<!doctype html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:24px;background:#fff"><div style="font:16px/1.6 Arial,sans-serif;color:#252735;max-width:640px;border-top:3px solid #e91953;padding-top:20px">'+html.replace(/\n/g,'<br>')+'</div></body></html>';
}
/** Sends one queued message. Caller holds the script lock and runs as the owner. */
function sendQueued_(m,a){
  assert_(validEmail_(m.recipient)&&[a.institutionalEmail,a.personalEmail].indexOf(m.recipient)>=0,'Destinatario de cola inválido');
  // Upgrade only pending mail, including messages queued before this version. Retain the actual sent text in Correos.
  m.body=deliveryBody_(m.body,a);
  m.status='SENDING';m.attempts=Number(m.attempts||0)+1;m.attemptedAt=now_();put_('Correos',m);SpreadsheetApp.flush();
  try{
    MailApp.sendEmail({to:m.recipient,subject:m.subject,body:m.body,htmlBody:mailHtml_(m.body),name:'Tesorería UMA',replyTo:UMA.owner});
    m.status='SENT';m.sentAt=now_();m.error='';
  }catch(e){
    // MailApp has no idempotency key or delivery receipt: an exception may follow acceptance.
    m.status='UNCERTAIN';m.error=String(e.message).slice(0,1500);error_('SEND_EMAIL',m.key,e);
  }
  put_('Correos',m);if(m.type!=='RECEIVED'){a.emailStatus=m.status;saveApplication_(a);}audit_(UMA.owner,'EMAIL_'+m.status,a.id,m.key);
  return m;
}
/**
 * Delivers a just-queued message right away so Treasury sees the real result instead of waiting for the
 * minute trigger. When it cannot send now, the message stays PENDING for the trigger and the reason is returned.
 * Caller holds the script lock.
 */
function sendNow_(key){
  // Never throws: the decision is already saved, so a delivery problem must be reported, not raised.
  try{return sendNowUnsafe_(key);}catch(e){error_('SEND_NOW',key,e);return {status:'PENDING',error:'No se pudo enviar ahora ('+String(e.message).slice(0,300)+'). El correo quedó en cola y se reintentará automáticamente.'};}
}
function sendNowUnsafe_(key){
  var m=find_('Correos','key',key);if(!m)return {status:'NONE',error:'No se generó ningún correo.'};
  var result=function(x,error){return {status:x.status,error:error||x.error||'',recipient:x.recipient,type:x.type};};
  if(m.status!=='PENDING')return result(m);
  var reason='';
  if(normalizeEmail_(Session.getEffectiveUser().getEmail())!==UMA.owner)reason='Se enviará desde la cuenta de Tesorería en el próximo minuto.';
  else if(config_().EMAIL_NOTIFICATION_ENABLED!=='true')reason='El envío de correos está pausado (EMAIL_NOTIFICATION_ENABLED). El correo quedó en cola.';
  else if(MailApp.getRemainingDailyQuota()<=0)reason='Se agotó la cuota diaria de correos de la cuenta de envío. Se enviará automáticamente cuando Google la renueve.';
  if(reason)return result(m,reason);
  var a=application_(m.applicationId);
  if(m.type!=='RECEIVED'&&a.lastDecisionKey!==m.decisionKey)return result(m,'La decisión aún no se registró por completo; el correo quedó en cola.');
  return result(sendQueued_(m,a));
}
/** Install this time-driven trigger while signed in as UMA.owner. */
function processEmailQueue(e) {
  owner_(e,'processEmailQueue');
  // Runs every minute: stop before opening the spreadsheet when the queue is known to be empty.
  // This keeps the owner's daily trigger runtime quota for real work.
  if(properties_().getProperty('MAIL_QUEUE_STATE')==='idle')return {idle:true};
  if(config_().EMAIL_NOTIFICATION_ENABLED!=='true')return {paused:true};
  return locked_(function(){
    recoverDecisions_();var cfg=config_();
    var logs=rows_('Correos');
    logs.filter(function(m){return m.status==='SENDING';}).forEach(function(m){m.status='UNCERTAIN';m.error='Ejecución interrumpida. Verifique el envío antes de resolver.';put_('Correos',m);var a=application_(m.applicationId);if(a.lastDecisionKey===m.decisionKey){a.emailStatus='UNCERTAIN';saveApplication_(a);}});
    if(cfg.EMAIL_NOTIFICATION_ENABLED!=='true')return {paused:true};
    var sent=0,quota=MailApp.getRemainingDailyQuota();
    // The owner trigger runs every minute. Keep batches small; never create extra mail to warm up.
    logs.filter(function(m){return m.status==='PENDING';}).slice(0,3).forEach(function(m){
      if(quota<=0)return;
      var a=application_(m.applicationId),receipt=m.type==='RECEIVED';
      if(!receipt&&a.lastDecisionKey!==m.decisionKey){
        // Do not send an obsolete correction request or uncommitted decision.
        var j=find_('Decisiones','key',m.decisionKey);if(j&&j.status!=='DONE')return;
        m.status='CANCELLED';m.error='Notificación reemplazada por una decisión posterior';put_('Correos',m);return;
      }
      var done=sendQueued_(m,a);m.status=done.status;if(done.status==='SENT'){quota--;sent++;}
    });
    if(!logs.some(function(m){return m.status==='PENDING'||m.status==='SENDING';}))properties_().setProperty('MAIL_QUEUE_STATE','idle');
    return {sent:sent,remainingQuota:quota};
  });
}
/** Only the owner may resolve an uncertain send after checking the recipient/mail records. */
function resolveEmail(key,resolution,note) {
  var actor=reviewer_(true);assert_(['CONFIRM_SENT','REQUEUE'].indexOf(resolution)>=0,'Resolución inválida');assert_(cleanText_(note).length>=10,'Documente la comprobación realizada');
  return locked_(function(){var m=find_('Correos','key',key);assert_(m&&m.status==='UNCERTAIN','Solo se resuelven envíos inciertos');
    var a=application_(m.applicationId),receipt=m.type==='RECEIVED';assert_(receipt||a.lastDecisionKey===m.decisionKey,'El mensaje quedó obsoleto');
    if(resolution==='CONFIRM_SENT'){m.status='SENT';m.sentAt=now_();}else{m.status='PENDING';markMailQueue_();}
    m.error=cleanText_(note,2000);put_('Correos',m);if(!receipt){a.emailStatus=m.status;saveApplication_(a);}audit_(actor,'EMAIL_'+resolution,a.id,note);return {status:m.status};});
}
/** Treasury action from the Correos tab: send a queued message now instead of waiting for the trigger. */
function sendEmailNow(key){
  reviewer_();return locked_(function(){var m=find_('Correos','key',key);assert_(m,'Correo no encontrado');assert_(m.status==='PENDING','Solo se envían ahora correos en cola');return sendNow_(key);});
}
