function restrictedFolder_(parent, name) {
  assert_(parent.getSharingAccess()===DriveApp.Access.PRIVATE,'La carpeta contenedora no está restringida');
  var it=parent.getFoldersByName(name),folder=it.hasNext()?it.next():parent.createFolder(name);
  folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);return folder;
}
function ensureApplicationFolder_(a) {
  if(a.folderId)return DriveApp.getFolderById(a.folderId);
  var period=restrictedFolder_(DriveApp.getFolderById(config_().ROOT_DRIVE_FOLDER_ID),a.period);
  // People who can open the spreadsheet can view the documents (Sharing.gs); never blocks the submission.
  try{sharePeriodFolder_(period);}catch(e){error_('DOCUMENT_ACCESS',a.id,e);}
  // Readable and stable: the code plus the institutional email that groups every submission.
  var folder=restrictedFolder_(period,a.id+(a.institutionalEmail?' · '+a.institutionalEmail:''));a.folderId=folder.getId();a.folderUrl=folder.getUrl();saveApplication_(a);return folder;
}
/** One name segment: no separators or characters Drive/Windows reject, single spaces. */
function nameSegment_(value) {
  return String(value||'').replace(/[_\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim()||'Sin dato';
}
/**
 * Treasury's naming rule: Estudiante_Convenio_Periodo_Tipo, e.g.
 * "Ana Pérez Ruiz_PNP_2027-I_Fichasocioeconomica.pdf". A second file of the same kind in one submission gets "_2".
 * `person` is the submission's own data, so a resubmission uses the name and agreement it was sent with.
 */
function documentName_(person, period, kind, index, ext) {
  var agreement=person.discount==='Otro'&&person.otherDiscount?person.otherDiscount:person.discount;
  return [nameSegment_(person.name),nameSegment_(agreement),nameSegment_(period),kind==='socioeconomic'?'Fichasocioeconomica':'Documento-sustentatorio'].join('_')
    +(index>0?'_'+String(index+1):'')+(ext?'.'+ext:'');
}
/** Copies the revision's uploads privately. Returns data issues; storage failures throw so they are retried. */
function copyDocuments_(a, uploads, revision, submittedAt, person) {
  // Every name derives from the submission time, so a retried copy finds the same folder and files.
  var stamp=limaStamp_(submittedAt||a.lastSubmissionAt||a.createdAt);
  var cfg=config_(),folder=restrictedFolder_(ensureApplicationFolder_(a),'Revisión '+revision+' · '+stamp),issues=[];
  if(!uploads.socioeconomic.length)issues.push('Falta la ficha socioeconómica');
  var all=uploads.socioeconomic.concat(uploads.supporting);assert_(all.length<=Number(cfg.MAX_FILES),'Demasiados documentos');
  var sources=all.map(function(id){assert_(/^[\w-]{10,}$/.test(id),'ID de archivo inválido');var f=DriveApp.getFileById(id);
    assert_(f.getOwner()&&normalizeEmail_(f.getOwner().getEmail())===UMA.owner,'La carga debe pertenecer a la cuenta administradora');
    assert_(['application/pdf','image/jpeg','image/png'].indexOf(f.getMimeType())>=0,'Solo PDF/JPG/PNG: '+f.getName());
    assert_(f.getSize()>0&&f.getSize()<=Number(cfg.MAX_FILE_BYTES),'Tamaño de archivo inválido');return f;
  });
  var cursor=0;
  ['socioeconomic','supporting'].forEach(function(kind){uploads[kind].forEach(function(sourceId,index){
    var source=sources[cursor++],key=a.id+':'+revision+':'+kind+':'+sourceId;
    if(find_('Documentos','key',key))return;
    var ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}[source.getMimeType()];
    // Deterministic names recover an interrupted copy-before-sheet-write without duplicating it.
    var name=documentName_(person||a,a.period,kind,index,ext),it=folder.getFilesByName(name),copy=it.hasNext()?it.next():source.makeCopy(name,folder);
    try{shareDocument_(copy);}catch(e){copy.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);}
    append_('Documentos',{key:key,applicationId:a.id,revision:revision,kind:kind,sourceId:sourceId,fileId:copy.getId(),name:name,mimeType:copy.getMimeType(),url:copy.getUrl(),createdAt:now_(),submittedAt:submittedAt||''});
  });});
  var docs=rows_('Documentos').filter(function(d){return d.applicationId===a.id&&Number(d.revision)===revision;});
  a.socioeconomicUrls=docs.filter(function(d){return d.kind==='socioeconomic';}).map(function(d){return d.url;}).join('\n');
  a.supportingUrls=docs.filter(function(d){return d.kind==='supporting';}).map(function(d){return d.url;}).join('\n');
  return issues;
}

/**
 * One-time upgrade (runs with reconcileSubmissions, or by the owner: renameDocumentFiles()): documents copied before
 * the naming rule get Estudiante_Convenio_Periodo_Tipo names in Drive, the panel, the Excel export and the Sheet.
 * Older revisions use the student's current data. Already renamed files are left as they are.
 */
function renameDocuments_() {
  var apps={},seen={},report={renamed:0,failed:[]};
  rows_('Solicitudes').forEach(function(a){apps[a.id]=a;});
  rows_('Documentos').forEach(function(d){
    var a=apps[d.applicationId];if(!a||!d.fileId)return;
    var group=d.applicationId+'|'+d.revision+'|'+d.kind,index=seen[group]||0;seen[group]=index+1;
    var ext=(String(d.name).match(/\.(pdf|jpg|png)$/i)||['',{'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}[d.mimeType]||''])[1];
    var name=documentName_(a,a.period,d.kind,index,ext);if(d.name===name)return;
    try{DriveApp.getFileById(d.fileId).setName(name);d.name=name;put_('Documentos',d);report.renamed++;}
    catch(e){report.failed.push(d.fileId+': '+e.message);}
  });
  if(report.renamed&&typeof responsesSheetEnabled_==='function'&&responsesSheetEnabled_())rebuildResponsesSheet_();
  properties_().setProperty('DOCUMENT_NAMES','v1');
  audit_(UMA.owner,'DOCUMENTS_RENAMED','',JSON.stringify(report).slice(0,2000));
  return report;
}
/** Owner action: rename existing documents now instead of waiting for the 10-minute trigger. */
function renameDocumentFiles(){setupOwner_();var r=locked_(renameDocuments_);console.log(JSON.stringify(r,null,2));return r;}
