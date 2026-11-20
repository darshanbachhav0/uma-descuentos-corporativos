var UMA = Object.freeze({
  owner: 'darshanbachhavapp@gmail.com',
  period: '2027-I',
  discounts: ['Familiar', 'PNP', 'San Hilarión', 'FED-CUT', 'Liderman', 'Emphost', 'El Tumi', 'Boticas Perú', 'Otro'],
  schools: ['Administración y Marketing','Administración y Negocios Internacionales','Contabilidad y Finanzas','Derecho','Enfermería','Farmacia y Bioquímica','Ingeniería de Inteligencia Artificial','Medicina Humana','Nutrición y Dietética','Psicología','Tecnología Médica en Laboratorio Clínico y Anatomía Patológica','Tecnología Médica en Terapia Física y Rehabilitación','Tecnología Médica en Optometría','Ingeniería Industrial'],
  categories: ['Ficha socioeconómica incompleta','Falta firma del estudiante','Documento ilegible','Falta documento sustentatorio','Datos incorrectos','Documento no corresponde','Información incompleta','Otro'],
  states: ['RECIBIDA','EN_REVISION','OBSERVADA','CORRECCION_RECIBIDA','APLICADA_SIGU'],
  // Retired status: existing rows are moved to EN_REVISION by migrateRetiredStatus_; kept in the groups below
  // only so such rows still count as pending until the migration runs.
  // An application stays pending (observed included) until the discount is applied in SIGU.
  pendingStates: ['RECIBIDA','EN_REVISION','OBSERVADA','CORRECCION_RECIBIDA','VALIDADA_PENDIENTE_SIGU'],
  // Treasury must act on these; OBSERVADA waits for the student.
  reviewStates: ['RECIBIDA','EN_REVISION','CORRECCION_RECIBIDA','VALIDADA_PENDIENTE_SIGU'],
  labels: {
    institutionalEmail:'Correo electrónico institucional',personalEmail:'Correo electrónico personal',
    identityType:'Tipo de documento',identityNumber:'Número de documento',name:'Apellidos y nombres',
    school:'Escuela profesional',discount:'Descuento corporativo',otherDiscount:'Otro convenio (especifique)',
    socioeconomic:'Ficha socioeconómica completa y firmada',supporting:'Documentos sustentatorios',
    signed:'Confirmación de ficha',consent:'Tratamiento de datos',
    applicationId:'Código de solicitud',token:'Código seguro de subsanación',clarification:'Aclaración del estudiante'
  },
  schema: {
    Solicitudes: ['id','createdAt','updatedAt','period','institutionalEmail','personalEmail','recipient','identityType','identityNumber','name','school','discount','otherDiscount','folderId','folderUrl','socioeconomicUrls','supportingUrls','initialResponseId','revision','version','status','reviewer','reviewedAt','siguConfirmedAt','siguReference','category','observation','instructions','correctionExpiresAt','correctionRevision','lastCorrectionAt','emailStatus','processingError','lastDecisionKey','issues','submissions','lastSubmissionAt'],
    Documentos: ['key','applicationId','revision','kind','sourceId','fileId','name','mimeType','url','createdAt'],
    Eventos: ['key','formId','responseId','applicationId','revision','status','timestamp','error','attempts','attemptedAt','retryAt'],
    Observaciones: ['key','applicationId','revision','category','observation','instructions','reviewer','timestamp'],
    Historial_Estados: ['key','applicationId','fromStatus','toStatus','reviewer','timestamp','detail'],
    Decisiones: ['key','applicationId','reviewer','payload','status','timestamp','error'],
    Correos: ['key','applicationId','decisionKey','type','recipient','subject','body','status','attempts','createdAt','attemptedAt','sentAt','error'],
    Auditoria: ['key','timestamp','actor','action','applicationId','detail'],
    Errores: ['key','timestamp','context','reference','message'],
    Configuracion: ['key','value'],
    Dashboard: ['indicador','valor']
  }
});

function properties_() { return PropertiesService.getScriptProperties(); }
function config_() {
  var p = properties_().getProperties();
  return Object.assign({ACADEMIC_PERIOD: UMA.period, AUTHORIZED_REVIEWERS: UMA.owner,
    INSTITUTIONAL_EMAIL_DOMAINS:'', EMAIL_NOTIFICATION_ENABLED:'false', CORRECTION_DAYS:'14',
    MAX_FILE_BYTES:String(10*1024*1024), MAX_FILES:'10', RECEIPT_EMAIL_ENABLED:'false'}, p);
}
function now_() { return new Date().toISOString(); }
function assert_(condition, message) { if (!condition) throw new Error(message); }
function locked_(callback) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  // Data read before the lock may be stale; locked work starts from a fresh read.
  if (typeof forgetTables_ === 'function') forgetTables_();
  try { return callback(); } finally { lock.releaseLock(); }
}
function effectiveOwner_() {
  assert_(normalizeEmail_(Session.getEffectiveUser().getEmail()) === UMA.owner,
    'Esta operación debe ejecutarse autorizada por ' + UMA.owner);
}
function owner_(event, handler) {
  effectiveOwner_();
  if(event && handler)assert_(String(event.triggerUid)===properties_().getProperty('TRIGGER_'+handler),'Disparador no autorizado');
  else setupOwner_();
}
function reviewer_(adminOnly) {
  if(typeof UMA_REQUEST_AUTH_!=='undefined'&&UMA_REQUEST_AUTH_){assert_(!adminOnly||UMA_REQUEST_AUTH_.admin,'Acceso denegado');return 'gestión:'+UMA_REQUEST_AUTH_.username;}
  assert_(config_().MANAGEMENT_AUTH_ENABLED!=='true','AUTH_REQUIRED: Inicie sesión para continuar.');
  var email = normalizeEmail_(Session.getActiveUser().getEmail());
  assert_(email, 'Google no proporcionó su identidad. Despliegue ejecutando como usuario que accede e inicie sesión.');
  var allowed = config_().AUTHORIZED_REVIEWERS.split(',').map(normalizeEmail_);
  assert_(email === UMA.owner || (!adminOnly && allowed.indexOf(email)>=0), 'Acceso denegado. Cuenta no autorizada.');
  return email;
}
function error_(context, reference, error) {
  console.error(context + ': ' + error.message);
  try { append_('Errores',{key:Utilities.getUuid(),timestamp:now_(),context:context,reference:reference,message:String(error.message).slice(0,2000)}); } catch (_) { console.error('No se pudo guardar el registro de error'); }
}
function audit_(actor, action, id, detail) {
  append_('Auditoria',{key:Utilities.getUuid(),timestamp:now_(),actor:actor,action:action,applicationId:id||'',detail:detail||''});
}
