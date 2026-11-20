/** A narrow RPC surface for the Render static frontend. Never executes arbitrary names. */
function bridgeCall(request) {
  reviewer_();
  assert_(request && typeof request === 'object', 'Solicitud de conexión inválida');
  assert_(allowedFrontend_(request.origin), 'Sitio de Tesorería no autorizado');
  var args = request.args || [];
  assert_(Array.isArray(args) && args.length <= 4, 'Argumentos inválidos');
  var methods = {
    getBootstrap:getBootstrap, listApplications:listApplications, getApplication:getApplication,
    listEmails:listEmails, listAudit:listAudit, updateSettings:updateSettings,
    saveDecision:saveDecision, setReviewStatus:setReviewStatus, renewCorrection:renewCorrection,
    resolveEmail:resolveEmail, exportExcel:exportExcel, runSystemHealthCheck:runSystemHealthCheck
  };
  assert_(Object.prototype.hasOwnProperty.call(methods,request.method), 'Operación no permitida');
  return methods[request.method].apply(null,args);
}
function allowedFrontend_(origin) {
  if(typeof origin !== 'string' || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin))return false;
  return String(config_().FRONTEND_ORIGINS||'').split(',').map(function(v){return v.trim();}).indexOf(origin)>=0;
}
function bridgePage_(e) {
  reviewer_();
  var origin=String(e.parameter.origin||''),channel=String(e.parameter.channel||'');
  assert_(allowedFrontend_(origin),'Origen del panel no autorizado');
  assert_(/^[a-f0-9]{64}$/.test(channel),'Canal de conexión inválido');
  var t=HtmlService.createTemplate(html_('Bridge'));
  t.settings=JSON.stringify({origin:origin,channel:channel}).replace(/</g,'\\u003c');
  return t.evaluate().setTitle('UMA · Conexión protegida').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
