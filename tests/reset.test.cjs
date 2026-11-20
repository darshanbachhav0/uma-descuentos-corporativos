const {test}=require('node:test'),assert=require('node:assert/strict'),{createSystem}=require('./harness.cjs');

/** Adds the Forms, Drive and spreadsheet pieces the reset uses on top of the standard fake system. */
function withResetFakes(s){
  const trashed=new Set(),deletedForms=[],linked={rows:5,getFormUrl:()=> 'https://docs.google.com/forms/d/x/edit',getLastRow(){return this.rows;},deleteRows(from,count){this.rows-=count;},getMaxColumns:()=>10,getRange(){return {clearContent:()=>{linked.cleared=true;}};}};
  const upload=id=>({getItem:()=>({getType:()=> 'FILE_UPLOAD'}),getResponse:()=>[id]});
  const text={getItem:()=>({getType:()=> 'TEXT'}),getResponse:()=> 'x'};
  const responses={initial:[{getItemResponses:()=>[text,upload('source_ficha_12345'),upload('unprocessed_upload_99')]}],correction:[]};
  s.ctx.FormApp.openById=id=>({getResponses:()=>responses[id]||[],deleteAllResponses(){deletedForms.push(id);responses[id]=[];}});
  const realFile=s.ctx.DriveApp.getFileById,realFolder=s.ctx.DriveApp.getFolderById;
  s.ctx.DriveApp.getFileById=id=>({setTrashed(){trashed.add(id);}});
  s.ctx.DriveApp.getFolderById=id=>{
    if(id==='root')return {getFolders(){const items=[{getName:()=> '2027-I',getId:()=> 'period-folder'},{getName:()=> 'Exportaciones',getId:()=> 'exports'},{getName:()=> 'Plantilla_original',getId:()=> 'template-folder'}];let i=0;return {hasNext:()=>i<items.length,next:()=>items[i++]};}};
    if(id==='exports')return {getFiles(){const items=[{getId:()=> 'old-export.xlsx'}];let i=0;return {hasNext:()=>i<items.length,next:()=>items[i++]};}};
    return {setTrashed(){trashed.add(id);}};
  };
  s.ctx.clearTable_=name=>{s.db[name].length=0;};
  s.ctx.responsesBook_=()=>({getSheets:()=>[linked,{getFormUrl:()=>null}]});
  return {trashed,deletedForms,linked};
}

test('preview counts what a reset would remove and changes nothing',()=>{
  const s=createSystem();s.ctx.ingest_(s.response('r1',s.valid()),false);const f=withResetFakes(s);
  const plan=s.ctx.previewReset();
  assert.equal(plan.rows.Solicitudes,1);assert.equal(plan.formResponses,1);assert.equal(plan.linkedSheetRows,4);
  assert.ok(plan.driveFilesToTrash>=4);assert.ok(plan.driveFoldersToTrash>=1);
  assert.equal(s.db.Solicitudes.length,1);assert.equal(f.trashed.size,0);assert.equal(f.deletedForms.length,0);
});

test('reset requires the exact confirmation phrase and the owner account',()=>{
  const s=createSystem();s.ctx.ingest_(s.response('r1',s.valid()),false);withResetFakes(s);
  assert.throws(()=>s.ctx.resetAllData(),/BORRAR TODO/);assert.throws(()=>s.ctx.resetAllData('borrar todo'),/BORRAR TODO/);
  s.setIdentity('reviewer@example.edu','darshanbachhavapp@gmail.com');assert.throws(()=>s.ctx.resetAllData('BORRAR TODO'),/propietaria/);
  assert.equal(s.db.Solicitudes.length,1);
});

test('reset empties every table, form and linked sheet, trashes platform files and restarts the numbering',()=>{
  const s=createSystem(),first=s.ctx.ingest_(s.response('r1',s.valid()),false);
  s.ctx.saveDecision({requestId:'reset-decision-01',id:first,version:s.ctx.application_(first).version,decision:'APPROVED',siguConfirmed:true});
  const f=withResetFakes(s),copies=s.db.Documentos.map(d=>d.fileId),folder=s.db.Solicitudes[0].folderId;
  const result=s.ctx.resetAllData('BORRAR TODO');
  for(const name of ['Solicitudes','Documentos','Eventos','Decisiones','Observaciones','Historial_Estados','Correos','Errores'])assert.equal(s.db[name].length,0,name);
  assert.deepEqual(s.db.Auditoria.map(a=>a.action),['DATA_RESET']);
  assert.deepEqual(f.deletedForms.sort(),['correction','initial']);
  assert.equal(f.linked.rows,2);assert.ok(f.linked.cleared);
  for(const id of [...copies,folder,'source_ficha_12345','unprocessed_upload_99','period-folder','old-export.xlsx'])assert.ok(f.trashed.has(id),id);
  for(const id of ['exports','template-folder'])assert.ok(!f.trashed.has(id),id);
  assert.equal(result.failed.length,0);
  assert.equal(s.props.SEQUENCE_2027,'0');
  // The next submission starts the numbering again.
  s.ctx.FormApp.openById=()=>({getPublishedUrl:()=>'',createResponse(){return {withItemResponse(){return this;},toPrefilledUrl:()=>''};},getItemById:()=>({asTextItem:()=>({createResponse:()=>({})})})});
  s.ctx.DriveApp.getFileById=id=>s.files.get(id);s.ctx.DriveApp.getFolderById=id=>s.folders.get(id);
  const again=s.ctx.ingest_(s.response('r2',s.valid()),false);
  assert.equal(again,'UMA-DC-2027-000001');
});

test('reset is not reachable from the panel or the API',()=>{
  const s=createSystem();s.props.FRONTEND_ORIGINS='https://uma.onrender.com';
  for(const method of ['resetAllData','previewReset'])assert.throws(()=>s.ctx.bridgeCall({origin:'https://uma.onrender.com',method,args:['BORRAR TODO']}),/permitida/);
});
