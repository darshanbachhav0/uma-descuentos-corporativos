function restrictedFolder_(parent, name) {
  assert_(parent.getSharingAccess()===DriveApp.Access.PRIVATE,'La carpeta contenedora no está restringida');
  var it=parent.getFoldersByName(name),folder=it.hasNext()?it.next():parent.createFolder(name);
  folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);return folder;
}
function ensureApplicationFolder_(a) {
  if(a.folderId)return DriveApp.getFolderById(a.folderId);
  var period=restrictedFolder_(DriveApp.getFolderById(config_().ROOT_DRIVE_FOLDER_ID),a.period);
  var folder=restrictedFolder_(period,a.id);a.folderId=folder.getId();a.folderUrl=folder.getUrl();saveApplication_(a);return folder;
}
/** Copies the revision's uploads privately. Returns data issues; storage failures throw so they are retried. */
function copyDocuments_(a, uploads, revision) {
  var cfg=config_(),folder=restrictedFolder_(ensureApplicationFolder_(a),'Revision_'+revision),issues=[];
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
    var name=kind+'_'+String(index+1)+'_'+sourceId+'.'+ext,it=folder.getFilesByName(name),copy=it.hasNext()?it.next():source.makeCopy(name,folder);
    copy.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    append_('Documentos',{key:key,applicationId:a.id,revision:revision,kind:kind,sourceId:sourceId,fileId:copy.getId(),name:kind+' '+(index+1)+'.'+ext,mimeType:copy.getMimeType(),url:copy.getUrl(),createdAt:now_()});
  });});
  var docs=rows_('Documentos').filter(function(d){return d.applicationId===a.id&&Number(d.revision)===revision;});
  a.socioeconomicUrls=docs.filter(function(d){return d.kind==='socioeconomic';}).map(function(d){return d.url;}).join('\n');
  a.supportingUrls=docs.filter(function(d){return d.kind==='supporting';}).map(function(d){return d.url;}).join('\n');
  return issues;
}
