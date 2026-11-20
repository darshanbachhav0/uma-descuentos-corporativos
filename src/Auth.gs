// Management authentication. Credentials and session verifiers stay in Google Script Properties/Cache.
var UMA_REQUEST_AUTH_ = null;
function setupOwner_(){
  effectiveOwner_();assert_(normalizeEmail_(Session.getActiveUser().getEmail())===UMA.owner,'Solo la cuenta propietaria puede realizar la configuración de Google.');
}
function digest_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function equalSecret_(a,b){a=String(a||'');b=String(b||'');var result=a.length^b.length;for(var i=0;i<Math.max(a.length,b.length);i++)result|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return result===0;}
function configureManagementAccess(input){
  setupOwner_();assert_(input&&/^[A-Za-z0-9._-]{3,40}$/.test(input.username)&&/^[a-f0-9]{32}$/.test(input.salt)&&/^[a-f0-9]{64}$/.test(input.proof),'Datos de acceso inválidos');
  assert_(Number(input.iterations)===600000,'Derivación de contraseña inválida');
  return locked_(function(){var p=properties_();p.setProperty('MANAGEMENT_USERNAME',input.username);p.setProperty('MANAGEMENT_SALT',input.salt);p.setProperty('MANAGEMENT_ITERATIONS','600000');p.setProperty('MANAGEMENT_VERIFIER',digest_(input.proof));p.setProperty('MANAGEMENT_CREDENTIAL_VERSION',Utilities.getUuid());p.setProperty('MANAGEMENT_AUTH_ENABLED','true');audit_(UMA.owner,'MANAGEMENT_ACCESS_CONFIGURED','','Usuario y contraseña configurados');return {configured:true,username:input.username};});
}
function managementAuthParameters_(){
  var c=config_();assert_(c.MANAGEMENT_AUTH_ENABLED==='true'&&c.MANAGEMENT_VERIFIER,'El administrador debe configurar el usuario y contraseña');
  return {salt:c.MANAGEMENT_SALT,iterations:Number(c.MANAGEMENT_ITERATIONS)};
}
function loginManagement_(input){
  managementAuthParameters_();assert_(input&&typeof input.username==='string'&&typeof input.proof==='string'&&input.username.length<=40&&/^[a-f0-9]{64}$/.test(input.proof),'Usuario o contraseña incorrectos');
  // No script lock here: the email and form jobs hold it for long periods, and a login only touches
  // the cache. Failures are counted per username so guesses for another name cannot lock Treasury out;
  // without the lock, simultaneous wrong attempts can each see the same count, which only delays the
  // 15-minute block by a few tries.
  return (function(){
    var cache=CacheService.getScriptCache(),key=loginFailureKey_(input.username),failed=Number(cache.get(key)||0),c=config_();
    assert_(failed<10,'Demasiados intentos. Espere 15 minutos y vuelva a intentar.');
    var valid=equalSecret_(digest_(input.proof),c.MANAGEMENT_VERIFIER),correctUser=equalSecret_(input.username,c.MANAGEMENT_USERNAME);
    if(!valid||!correctUser){cache.put(key,String(failed+1),900);throw new Error('Usuario o contraseña incorrectos');}
    cache.remove(key);var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''),expiresAt=Date.now()+21600000;
    cache.put('UMA_SESSION_'+digest_(token),JSON.stringify({username:c.MANAGEMENT_USERNAME,admin:true,expiresAt:expiresAt,version:c.MANAGEMENT_CREDENTIAL_VERSION}),21600);
    // The audit row is best effort: a slow or busy spreadsheet must not block access.
    try{audit_('gestión:'+c.MANAGEMENT_USERNAME,'AUTH_LOGIN','','Ingreso al panel');}catch(e){console.error('AUTH_LOGIN audit: '+e.message);}
    return {token:token,expiresAt:expiresAt};
  })();
}
function loginFailureKey_(username){return 'UMA_LOGIN_FAILURES_'+digest_(String(username||'').trim().toLowerCase()).slice(0,32);}
function managementSession_(token){
  assert_(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token),'AUTH_REQUIRED: Inicie sesión para continuar.');
  var record=CacheService.getScriptCache().get('UMA_SESSION_'+digest_(token)),session=record&&JSON.parse(record),c=config_();
  assert_(c.MANAGEMENT_AUTH_ENABLED==='true'&&session&&session.expiresAt>Date.now()&&session.version===c.MANAGEMENT_CREDENTIAL_VERSION,'AUTH_REQUIRED: Su sesión terminó. Ingrese nuevamente.');return session;
}
function withManagementSession_(token,callback){
  assert_(!UMA_REQUEST_AUTH_,'Contexto de acceso inválido');UMA_REQUEST_AUTH_=managementSession_(token);
  try{return callback();}finally{UMA_REQUEST_AUTH_=null;}
}
function logoutManagement_(token){var actor=reviewer_();CacheService.getScriptCache().remove('UMA_SESSION_'+digest_(token));audit_(actor,'AUTH_LOGOUT','','Salida del panel');return {ok:true};}
function getDocumentFile(applicationId,fileId){
  var actor=reviewer_();application_(applicationId);var doc=rows_('Documentos').find(function(d){return d.applicationId===applicationId&&d.fileId===fileId;});
  assert_(doc,'El documento no pertenece a este expediente');var file=DriveApp.getFileById(doc.fileId),mime=file.getMimeType();
  assert_(['application/pdf','image/jpeg','image/png'].indexOf(mime)>=0&&file.getSize()<=Number(config_().MAX_FILE_BYTES),'Archivo no permitido');
  audit_(actor,'DOCUMENT_OPENED',applicationId,doc.name);return {name:doc.name,mimeType:mime,data:Utilities.base64Encode(file.getBlob().getBytes())};
}
