const {test}=require('node:test'),assert=require('node:assert/strict'),{createSystem}=require('./harness.cjs');

function fakeSheet(name,rows,formUrl){const s={name,rows,getName:()=>s.name,setName(n){s.name=n;},getLastRow:()=>s.rows,getFormUrl:()=>formUrl||null,copyTo(dest){const copy=fakeSheet('Copia de '+s.name,s.rows);dest.sheets.push(copy);return copy;}};return s;}
function fakeBook(id,sheets){const b={id,sheets,getId:()=>id,getSheets:()=>b.sheets.slice(),getSheetByName:n=>b.sheets.find(s=>s.name===n)||null,deleteSheet(s){assert.ok(b.sheets.length>1,'cannot delete the last tab');b.sheets=b.sheets.filter(x=>x!==s);},setSpreadsheetTimeZone(){}};return b;}

test('organizeSpreadsheet leaves only the application form responses in the main spreadsheet',()=>{
  const s=createSystem(),names=Object.keys(s.ctx.UMA.schema);
  const main=fakeBook('sheet',[...names.map(n=>fakeSheet(n,3)),fakeSheet('Form Responses 1',6,'https://docs.google.com/forms/d/initial/edit'),fakeSheet('Form Responses 2',2,'https://docs.google.com/forms/d/correction/edit'),fakeSheet('Sheet1',0),fakeSheet('Notas',2)]);
  let system=null,moved=false,unlinked=false;
  s.ctx.SpreadsheetApp.openById=id=>id==='sheet'?main:system;
  s.ctx.SpreadsheetApp.create=name=>{system=fakeBook('system-book',[fakeSheet('Sheet1',0)]);system.name=name;return system;};
  const realFolder=s.ctx.DriveApp.getFolderById;
  s.ctx.DriveApp.getFileById=()=>({moveTo(){moved=true;},setSharing(){}});
  s.ctx.FormApp.openById=()=>({getDestinationId:()=> 'sheet',removeDestination(){unlinked=true;}});
  const report=s.ctx.organizeSpreadsheet();
  assert.deepEqual(main.getSheets().map(x=>x.getName()),['Form Responses 1','Notas']);
  assert.deepEqual(system.getSheets().map(x=>x.getName()).sort(),names.slice().sort());
  assert.equal(s.props.SYSTEM_SPREADSHEET_ID,'system-book');assert.ok(moved);assert.ok(unlinked);
  assert.ok(report.removed.includes('Form Responses 2')&&report.removed.includes('Sheet1'));
  assert.ok(report.kept.some(k=>k.startsWith('Notas')));
  // Running it again changes nothing.
  s.ctx.organizeSpreadsheet();
  assert.deepEqual(main.getSheets().map(x=>x.getName()),['Form Responses 1','Notas']);
  assert.equal(realFolder,s.ctx.DriveApp.getFolderById);
});

test('a copy that does not match stops before anything is deleted or switched',()=>{
  const s=createSystem(),names=Object.keys(s.ctx.UMA.schema);
  const main=fakeBook('sheet',[...names.map(n=>fakeSheet(n,3)),fakeSheet('Form Responses 1',6,'https://docs.google.com/forms/d/initial/edit')]);
  const system=fakeBook('system-book',[fakeSheet('Solicitudes',1)]);
  s.props.SYSTEM_SPREADSHEET_ID_PENDING='system-book';
  s.ctx.SpreadsheetApp.openById=id=>id==='sheet'?main:system;
  s.ctx.FormApp.openById=()=>({getDestinationId:()=> 'sheet',removeDestination(){}});
  assert.throws(()=>s.ctx.organizeSpreadsheet(),/no coincide/);
  assert.equal(main.getSheets().length,names.length+1);assert.equal(s.props.SYSTEM_SPREADSHEET_ID,undefined);
});

test('the system tables are read from the separate spreadsheet once it is set',()=>{
  const s=createSystem();s.props.SYSTEM_SPREADSHEET_ID='system-book';let opened='';
  s.ctx.SpreadsheetApp.openById=id=>{opened=id;return fakeBook(id,[]);};
  s.ctx.UMA_MEMO_={};s.ctx.book_();assert.equal(opened,'system-book');
  s.ctx.responsesBook_();assert.equal(opened,'sheet');
});

test('an old correction-form response with an invalid code is grouped by institutional email',()=>{
  const s=createSystem(),id=s.ctx.ingest_(s.response('first',s.valid()),false),a=s.ctx.application_(id);
  s.ctx.saveDecision({requestId:'observe-for-fallback',id,version:a.version,decision:'OBSERVED',category:'Datos incorrectos',observation:'Los datos no coinciden con los documentos.'});
  const values=s.valid({applicationId:'UMA-DC-2027-999999',token:'expired-or-wrong',institutionalEmail:a.institutionalEmail.toUpperCase(),identityNumber:a.identityNumber});
  const linked=s.ctx.ingest_(s.response('old-correction',values),true),after=s.ctx.application_(id);
  assert.equal(linked,id);assert.equal(after.status,'CORRECCION_RECIBIDA');assert.equal(after.revision,2);
  assert.match(after.issues,/formulario de corrección anterior/);
  assert.equal(s.ctx.listApplications({},1,20).stats.unlinked,0);
});

test('an old correction-form response that matches no student is closed instead of retried forever',()=>{
  const s=createSystem();
  const values=s.valid({applicationId:'UMA-DC-2027-999999',token:'wrong',institutionalEmail:'nobody@uma.edu.pe',identityNumber:'12345678'});
  assert.equal(s.ctx.ingest_(s.response('orphan',values),true),'');
  assert.equal(s.db.Eventos[0].status,'DONE');assert.match(s.db.Eventos[0].error,/DISCARDED/);
  assert.ok(s.db.Errores.some(e=>e.context==='CORRECTION_DISCARDED'));
  assert.equal(s.ctx.listApplications({},1,20).stats.unlinked,0);
});
